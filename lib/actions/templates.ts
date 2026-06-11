"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ProcessTemplatesInput {
  userId: string;
  templateEdits: Record<string, number>; // Maps templateId -> amount
}

export async function processMonthlyTemplatesAction({
  userId,
  templateEdits,
}: ProcessTemplatesInput) {
  try {
    const templates = await prisma.monthlyTemplate.findMany({
      where: { userId, isActive: true },
    });

    if (templates.length === 0) {
      return { success: true, message: "No active templates to process" };
    }

    const today = new Date();
    // Set transaction date to the 1st of the current month
    const transactionDate = new Date(today.getFullYear(), today.getMonth(), 1);

    // Run database transactions sequentially to ensure account balances update correctly
    await prisma.$transaction(async (tx) => {
      for (const template of templates) {
        // Use the edited amount if provided, otherwise fallback to template default
        const amount =
          templateEdits[template.id] !== undefined
            ? templateEdits[template.id]
            : template.amount;

        if (amount <= 0) continue; // Skip items with zero or negative amounts

        // Fetch account
        const account = await tx.account.findUnique({
          where: { id: template.accountId },
        });

        if (!account) {
          throw new Error(`Account not found for template ${template.name}`);
        }

        // Deduct from account balance
        const newBalance = account.balance - amount;

        // Create transaction
        await tx.transaction.create({
          data: {
            userId,
            accountId: template.accountId,
            type: "expense",
            amount,
            currency: template.currency,
            category: "template",
            description: template.name,
            isTemplate: true,
            date: transactionDate,
          },
        });

        // Update account balance
        await tx.account.update({
          where: { id: template.accountId },
          data: { balance: newBalance },
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/monthly-templates");

    return { success: true };
  } catch (error) {
    console.error("Failed to process monthly templates:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Action to update template configuration (amount, isActive)
export async function updateTemplateAction(
  templateId: string,
  data: { amount: number; isActive: boolean; accountId: string }
) {
  try {
    await prisma.monthlyTemplate.update({
      where: { id: templateId },
      data: {
        amount: data.amount,
        isActive: data.isActive,
        accountId: data.accountId,
      },
    });

    revalidatePath("/monthly-templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { success: false, error: (error as Error).message };
  }
}
