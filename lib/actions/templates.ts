"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Mark a template as paid — deducts full amount from account and records a transaction
export async function markTemplatePaidAction(
  templateId: string,
  sourceAccountId?: string,
  customAmount?: number
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  try {
    // Check if it is a credit card bill
    if (templateId.startsWith("cc-bill-")) {
      const ccAccountId = templateId.replace("cc-bill-", "");

      const ccAccount = await prisma.account.findFirst({
        where: { id: ccAccountId, userId },
      });
      if (!ccAccount) return { success: false, error: "Credit card account not found" };
      if (ccAccount.type !== "credit_card") return { success: false, error: "Account is not a credit card" };
      if (!ccAccount.isActive) return { success: false, error: "Credit card account is inactive" };

      const totalDebt = Math.abs(ccAccount.balance);
      if (totalDebt <= 0) return { success: false, error: "No outstanding balance to pay on this credit card" };

      let amountToPay = totalDebt;
      if (customAmount !== undefined && customAmount !== null) {
        if (customAmount <= 0) return { success: false, error: "Payment amount must be greater than zero" };
        amountToPay = customAmount;
      }

      if (!sourceAccountId) {
        return { success: false, error: "Source account is required to pay credit card bill" };
      }

      const sourceAccount = await prisma.account.findFirst({
        where: { id: sourceAccountId, userId },
      });
      if (!sourceAccount) return { success: false, error: "Paying account not found" };
      if (!sourceAccount.isActive) return { success: false, error: "Paying account is inactive" };
      if (sourceAccount.currency !== ccAccount.currency) {
        return { success: false, error: "Currency mismatch between paying account and credit card" };
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

      const operations: any[] = [
        // 1. Expense from paying account
        prisma.transaction.create({
          data: {
            userId,
            accountId: sourceAccountId,
            type: "expense",
            amount: amountToPay,
            currency: sourceAccount.currency,
            category: "template", // mark as template/recurring bill
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
            category: "template",
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

      await prisma.$transaction(operations);

      revalidatePath("/");
      revalidatePath("/transactions");
      revalidatePath("/settings");
      return { success: true };
    }

    // Otherwise, normal monthly template payment
    const template = await prisma.monthlyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.userId !== userId) {
      return { success: false, error: "Template not found" };
    }
    if (!template.isActive) {
      return { success: false, error: "Template is inactive" };
    }
    if (template.amount <= 0) {
      return { success: false, error: "Please set an amount before marking as paid" };
    }

    const account = await prisma.account.findUnique({
      where: { id: template.accountId },
    });
    if (!account) return { success: false, error: "Linked account not found" };
    if (!account.isActive) return { success: false, error: "Linked account is inactive" };

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          accountId: template.accountId,
          type: "expense",
          amount: template.amount,
          currency: template.currency,
          category: "template",
          description: template.name,
          isTemplate: true,
          date: new Date(),
        },
      }),
      prisma.account.update({
        where: { id: template.accountId },
        data: { balance: account.balance - template.amount },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("markTemplatePaidAction error:", err);
    return { success: false, error: "Failed to process payment" };
  }
}

// Update template configuration (amount, isActive, accountId, intervalMonths)
export async function updateTemplateAction(
  templateId: string,
  data: { name?: string; amount: number; isActive: boolean; accountId: string; intervalMonths: number }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    });
    if (!account) {
      return { success: false, error: "Selected account not found" };
    }
    if (!account.isActive) {
      return { success: false, error: "Selected account is inactive" };
    }

    await prisma.monthlyTemplate.update({
      where: { id: templateId, userId: session.user.id },
      data: {
        name: data.name,
        amount: data.amount,
        isActive: data.isActive,
        accountId: data.accountId,
        intervalMonths: data.intervalMonths,
        currency: account.currency, // Ensure currency matches account
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("updateTemplateAction error:", err);
    return { success: false, error: "Failed to update bill" };
  }
}

// Create a monthly bill template
export async function createTemplateAction(data: {
  name: string;
  amount: number;
  accountId: string;
  intervalMonths: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) {
      return { success: false, error: "Selected account not found" };
    }
    if (!account.isActive) {
      return { success: false, error: "Selected account is inactive" };
    }

    const newTemplate = await prisma.monthlyTemplate.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        currency: account.currency, // Inherit currency from account
        accountId: data.accountId,
        intervalMonths: data.intervalMonths,
        isActive: true,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, template: newTemplate };
  } catch (err) {
    console.error("createTemplateAction error:", err);
    return { success: false, error: "Failed to create bill" };
  }
}

// Delete a monthly bill template
export async function deleteTemplateAction(templateId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    await prisma.monthlyTemplate.delete({
      where: { id: templateId, userId },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("deleteTemplateAction error:", err);
    return { success: false, error: "Failed to delete bill" };
  }
}
