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
    return { success: false, error: "Failed to update account" };
  }
}
