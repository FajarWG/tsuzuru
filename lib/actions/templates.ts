"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Mark a template as paid — deducts full amount from account and records a transaction
export async function markTemplatePaidAction(templateId: string, sourceAccountId?: string) {
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

      const amountToPay = Math.abs(ccAccount.balance);
      if (amountToPay <= 0) return { success: false, error: "No outstanding balance to pay on this credit card" };

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
      await prisma.$transaction([
        // 1. Expense from paying account
        prisma.transaction.create({
          data: {
            userId,
            accountId: sourceAccountId,
            type: "expense",
            amount: amountToPay,
            currency: sourceAccount.currency,
            category: "template", // mark as template/recurring bill
            description: `Bayar Tagihan ${ccAccount.name}`,
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
            description: `Pembayaran dari ${sourceAccount.name}`,
            isTemplate: true,
            date: new Date(),
          },
        }),
        // 3. Deduct from source account balance
        prisma.account.update({
          where: { id: sourceAccountId },
          data: { balance: sourceAccount.balance - amountToPay },
        }),
        // 4. Increase credit card account balance (bringing it back to 0 or reducing debt)
        prisma.account.update({
          where: { id: ccAccountId },
          data: { balance: ccAccount.balance + amountToPay },
        }),
      ]);

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
