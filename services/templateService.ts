import { templateRepository } from "@/repositories/templateRepository";
import { accountRepository } from "@/repositories/accountRepository";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePaymentMode,
  TemplateSplitConfigInput,
} from "@/types/template";

function normalizeSplitConfig(
  paymentMode: TemplatePaymentMode,
  splitConfig?: TemplateSplitConfigInput | null,
) {
  if (paymentMode !== "split_with_friends") {
    return null;
  }

  const friends = (splitConfig?.friends || [])
    .map((friend) => ({
      personName: friend.personName.trim(),
      percentage: Number(friend.percentage),
    }))
    .filter((friend) => friend.personName);

  if (friends.length === 0) {
    throw new Error("Add at least one friend for split bills");
  }

  const invalidFriend = friends.find(
    (friend) => !Number.isFinite(friend.percentage) || friend.percentage <= 0,
  );
  if (invalidFriend) {
    throw new Error("Each friend split percentage must be greater than 0");
  }

  const uniqueNames = new Set(friends.map((friend) => friend.personName.toLowerCase()));
  if (uniqueNames.size !== friends.length) {
    throw new Error("Friend names in split bills must be unique");
  }

  const totalPercentage = friends.reduce(
    (sum, friend) => sum + friend.percentage,
    0,
  );

  if (totalPercentage >= 100) {
    throw new Error("Total friend split percentage must stay below 100%");
  }

  return {
    friends,
  };
}

function buildSplitBills(params: {
  userId: string;
  templateName: string;
  amount: number;
  currency: string;
  splitConfig: TemplateSplitConfigInput;
  splitGroupId: string;
}) {
  const { userId, templateName, amount, currency, splitConfig, splitGroupId } = params;

  return splitConfig.friends
    .map((friend) => {
      const rawShare = (amount * friend.percentage) / 100;
      const shareAmount = (currency === "JPY" || currency === "IDR")
        ? Math.round(rawShare)
        : Number(rawShare.toFixed(2));
      if (shareAmount <= 0) {
        return null;
      }

      return {
        userId,
        personName: friend.personName,
        amount: shareAmount,
        currency,
        direction: "they_owe",
        description: `[tx_id:${splitGroupId}] Split recurring bill: ${templateName} (${friend.percentage}%)`,
        category: "adjustment",
        subCategory: null,
      };
    })
    .filter((bill): bill is NonNullable<typeof bill> => bill !== null);
}

export const templateService = {
  async markTemplatePaid(templateId: string, userId: string, sourceAccountId?: string, customAmount?: number) {
    // Check if it is a credit card bill
    if (templateId.startsWith("cc-bill-")) {
      const ccAccountId = templateId.replace("cc-bill-", "");

      const ccAccount = await accountRepository.findById(ccAccountId, userId);
      if (!ccAccount) throw new Error("Credit card account not found");
      if (ccAccount.type !== "credit_card") throw new Error("Account is not a credit card");
      if (!ccAccount.isActive) throw new Error("Credit card account is inactive");

      const totalDebt = Math.abs(ccAccount.balance);
      if (totalDebt <= 0) throw new Error("No outstanding balance to pay on this credit card");

      let amountToPay = totalDebt;
      if (customAmount !== undefined && customAmount !== null) {
        if (customAmount <= 0) throw new Error("Payment amount must be greater than zero");
        amountToPay = customAmount;
      }

      if (!sourceAccountId) {
        throw new Error("Source account is required to pay credit card bill");
      }

      const sourceAccount = await accountRepository.findById(sourceAccountId, userId);
      if (!sourceAccount) throw new Error("Paying account not found");
      if (!sourceAccount.isActive) throw new Error("Paying account is inactive");
      if (sourceAccount.currency !== ccAccount.currency) {
        throw new Error("Currency mismatch between paying account and credit card");
      }

      // Record transfer transactions and update balances
      let newCcBalance = ccAccount.balance + amountToPay;
      let adjustmentTx = null;

      if (amountToPay > totalDebt) {
        const adjustmentAmount = amountToPay - totalDebt;
        newCcBalance = 0; // The balance should be exactly 0 after paying off the debt and recording the adjustment

        // Create an expense transaction for the difference (previous month's debt that was not recorded in the app)
        adjustmentTx = prisma.transaction.create({
          data: {
            userId,
            accountId: ccAccountId,
            type: "expense",
            amount: adjustmentAmount,
            currency: ccAccount.currency,
            category: "adjustment",
            description: "CC Payment Adjustment",
            isTemplate: false,
            date: new Date(),
          },
        });
      }

      const operations: Prisma.PrismaPromise<unknown>[] = [
        // 1. Expense from paying account
        prisma.transaction.create({
          data: {
            userId,
            accountId: sourceAccountId,
            type: "expense",
            amount: amountToPay,
            currency: sourceAccount.currency,
            category: "adjustment", // mark as adjustment/recurring bill
            description: `CC Payoff: ${ccAccount.name}`,
            isTemplate: true,
            date: new Date(),
          },
        }),
        // 2. Income/payment to credit card account (reducing its debt)
        prisma.transaction.create({
          data: {
            userId,
            accountId: ccAccountId,
            type: "income",
            amount: amountToPay,
            currency: ccAccount.currency,
            category: "adjustment",
            description: `Payment from ${sourceAccount.name}`,
            isTemplate: true,
            date: new Date(),
          },
        }),
        // 3. Deduct from source account balance
        prisma.account.update({
          where: { id: sourceAccountId },
          data: { balance: sourceAccount.balance - amountToPay },
        }),
        // 4. Update credit card account balance
        prisma.account.update({
          where: { id: ccAccountId },
          data: { balance: newCcBalance },
        }),
      ];

      if (adjustmentTx) {
        operations.push(adjustmentTx);
      }

      await templateRepository.markCreditCardTemplatePaidWithBalanceUpdate({ operations });
      return;
    }

    // Otherwise, normal monthly template payment
    const template = await templateRepository.findById(templateId);

    if (!template || template.userId !== userId) {
      throw new Error("Template not found");
    }
    if (!template.isActive) {
      throw new Error("Template is inactive");
    }
    if (template.amount <= 0) {
      throw new Error("Please set an amount before marking as paid");
    }

    const targetAccountId = sourceAccountId || template.accountId;
    const account = await accountRepository.findById(targetAccountId, userId);
    if (!account) throw new Error("Paying account not found");
    if (!account.isActive) throw new Error("Paying account is inactive");
    if (account.currency !== template.currency) {
      throw new Error("Currency mismatch between paying account and bill");
    }

    const splitConfig = normalizeSplitConfig(
      (template.paymentMode as TemplatePaymentMode) || "self_paid",
      (template.splitConfig as TemplateSplitConfigInput | null | undefined) || null,
    );

    const splitGroupId = splitConfig
      ? "split_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now()
      : null;

    const friendBills = splitConfig && splitGroupId
      ? buildSplitBills({
          userId,
          templateName: template.name,
          amount: template.amount,
          currency: template.currency,
          splitConfig,
          splitGroupId,
        })
      : [];

    await prisma.$transaction(async (tx) => {
      const txDescription = splitGroupId
        ? `${template.name} [tx_id:${splitGroupId}]`
        : template.name;

      await tx.transaction.create({
        data: {
          userId,
          accountId: targetAccountId,
          type: "expense",
          amount: template.amount,
          currency: template.currency,
          category: template.category || "living_expenses",
          subCategory: template.subCategory || "utilities",
          description: txDescription,
          splitGroupId: splitGroupId,
          isTemplate: true,
          date: new Date(),
        },
      });

      await tx.account.update({
        where: { id: targetAccountId },
        data: { balance: account.balance - template.amount },
      });

      for (const bill of friendBills) {
        await tx.billFriend.create({
          data: bill,
        });
      }
    });
  },

  async updateTemplate(templateId: string, data: UpdateTemplateInput, userId: string) {
    const account = await accountRepository.findById(data.accountId, userId);
    if (!account) {
      throw new Error("Selected account not found");
    }
    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const paymentMode = data.paymentMode || "self_paid";
    const splitConfig = normalizeSplitConfig(paymentMode, data.splitConfig);

    await templateRepository.update(templateId, userId, {
      name: data.name,
      amount: data.amount,
      isActive: data.isActive,
      accountId: data.accountId,
      intervalMonths: data.intervalMonths,
      paymentMode,
      splitConfig: splitConfig ?? Prisma.JsonNull,
      currency: account.currency, // Ensure currency matches account
      category: data.category || "living_expenses",
      subCategory: data.subCategory || "utilities",
    });
  },

  async createTemplate(data: CreateTemplateInput, userId: string) {
    const account = await accountRepository.findById(data.accountId, userId);
    if (!account) {
      throw new Error("Selected account not found");
    }
    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const paymentMode = data.paymentMode || "self_paid";
    const splitConfig = normalizeSplitConfig(paymentMode, data.splitConfig);

    return templateRepository.create({
      userId,
      name: data.name,
      amount: data.amount,
      currency: account.currency, // Inherit currency from account
      accountId: data.accountId,
      intervalMonths: data.intervalMonths,
      paymentMode,
      splitConfig: splitConfig ?? Prisma.JsonNull,
      isActive: true,
      category: data.category || "living_expenses",
      subCategory: data.subCategory || "utilities",
    });
  },

  async deleteTemplate(templateId: string, userId: string) {
    await templateRepository.delete(templateId, userId);
  },
};
