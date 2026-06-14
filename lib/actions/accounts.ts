"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateAccountBalanceWithHistoryAction(
  accountId: string,
  newBalance: number,
  reason?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId, userId },
    });
    if (!account) return { success: false, error: "Account not found" };

    const diff = newBalance - account.balance;
    if (diff === 0) {
      // Balance unchanged — still save name if provided
      await prisma.account.update({ where: { id: accountId }, data: { balance: newBalance } });
      revalidatePath("/");
      return { success: true };
    }

    const isIncrease = diff > 0;

    await prisma.$transaction([
      // Record adjustment transaction
      prisma.transaction.create({
        data: {
          userId,
          accountId,
          type: isIncrease ? "income" : "expense",
          amount: Math.abs(diff),
          currency: account.currency,
          category: "adjustment",
          description: reason?.trim() || "Balance adjustment",
          date: new Date(),
        },
      }),
      // Update account balance
      prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    console.error("updateAccountBalanceWithHistoryAction error:", err);
    return { success: false, error: "Failed to update account balance" };
  }
}

export async function updateAccountNameAction(accountId: string, name: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.account.update({
      where: { id: accountId, userId: session.user.id },
      data: { name: name.trim(), isActive },
    });
    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("updateAccountNameAction error:", err);
    return { success: false, error: "Failed to update account" };
  }
}

export async function createAccountAction(data: {
  name: string;
  currency: string;
  balance: number;
  type: string;
  defaultPaymentAccountId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const account = await prisma.account.create({
      data: {
        userId,
        name: data.name.trim(),
        currency: data.currency,
        balance: data.balance,
        type: data.type,
        isActive: true,
        defaultPaymentAccountId: data.type === "credit_card" ? data.defaultPaymentAccountId || null : null,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: true, account };
  } catch (err) {
    console.error("createAccountAction error:", err);
    return { success: false, error: "Failed to create account" };
  }
}

export async function updateAccountAction(
  accountId: string,
  data: {
    name: string;
    currency: string;
    balance: number;
    type: string;
    isActive: boolean;
    defaultPaymentAccountId?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const account = await prisma.account.update({
      where: { id: accountId, userId },
      data: {
        name: data.name.trim(),
        currency: data.currency,
        balance: data.balance,
        type: data.type,
        isActive: data.isActive,
        defaultPaymentAccountId: data.type === "credit_card" ? data.defaultPaymentAccountId || null : null,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: true, account };
  } catch (err) {
    console.error("updateAccountAction error:", err);
    return { success: false, error: "Failed to update account" };
  }
}

export async function deleteAccountAction(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    // Delete linked monthly templates (bills) first to prevent orphans,
    // and rely on PostgreSQL cascade delete for transactions
    await prisma.$transaction([
      prisma.monthlyTemplate.deleteMany({
        where: { accountId, userId },
      }),
      prisma.account.updateMany({
        where: { defaultPaymentAccountId: accountId, userId },
        data: { defaultPaymentAccountId: null },
      }),
      prisma.account.delete({
        where: { id: accountId, userId },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    console.error("deleteAccountAction error:", err);
    return { success: false, error: "Failed to delete account" };
  }
}
