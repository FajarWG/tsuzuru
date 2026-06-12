"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Mark a template as paid — deducts full amount from account and records a transaction
export async function markTemplatePaidAction(templateId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  try {
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
  data: { amount: number; isActive: boolean; accountId: string; intervalMonths: number }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.monthlyTemplate.update({
      where: { id: templateId, userId: session.user.id },
      data: {
        amount: data.amount,
        isActive: data.isActive,
        accountId: data.accountId,
        intervalMonths: data.intervalMonths,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("updateTemplateAction error:", err);
    return { success: false, error: "Failed to update template" };
  }
}
