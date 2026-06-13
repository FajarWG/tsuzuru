"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreateTransactionInput {
  userId: string;
  accountId: string;
  type: "expense" | "income";
  amount: number;
  category: string;
  subCategory?: string | null;
  mealNumber?: number | null;
  description?: string | null;
  date?: Date;
  isReceipt?: boolean;
  receiptItems?: any;
}

interface UpdateTransactionInput extends CreateTransactionInput {
  id: string;
}

function getBalanceDelta(type: "expense" | "income", amount: number) {
  return type === "expense" ? -amount : amount;
}

export async function createTransactionAction(data: CreateTransactionInput) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const transactionDate = data.date || new Date();

    const newBalance = account.balance + getBalanceDelta(data.type, data.amount);

    // Execute database transaction to guarantee consistency
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          currency: account.currency,
          category: data.category,
          subCategory: data.subCategory,
          mealNumber: data.mealNumber,
          description: data.description,
          date: transactionDate,
          isReceipt: data.isReceipt ?? false,
          receiptItems: data.receiptItems ?? null,
        },
      }),
      prisma.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/charts");

    return { success: true };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTransactionAction(data: UpdateTransactionInput) {
  try {
    if (!data.amount || data.amount <= 0) {
      throw new Error("Please enter a valid amount");
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: data.id, userId: data.userId },
    });

    if (!existing) {
      throw new Error("Transaction not found");
    }

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId: data.userId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.isActive) {
      throw new Error("Selected account is inactive");
    }

    const oldDelta = getBalanceDelta(existing.type as "expense" | "income", existing.amount);
    const newDelta = getBalanceDelta(data.type, data.amount);

    await prisma.$transaction(async (tx) => {
      if (existing.accountId === data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: newDelta - oldDelta } },
        });
      } else {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: -oldDelta } },
        });
        await tx.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: newDelta } },
        });
      }

      await tx.transaction.update({
        where: { id: data.id },
        data: {
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          currency: account.currency,
          category: data.category,
          subCategory: data.subCategory,
          mealNumber: data.mealNumber,
          description: data.description,
          date: data.date || existing.date,
          isReceipt: data.isReceipt ?? existing.isReceipt,
          receiptItems: data.receiptItems !== undefined ? data.receiptItems : existing.receiptItems,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/charts");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTransactionAction(transactionId: string, userId: string) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existing) {
      throw new Error("Transaction not found");
    }

    const oldDelta = getBalanceDelta(existing.type as "expense" | "income", existing.amount);

    await prisma.$transaction([
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
      prisma.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: -oldDelta } },
      }),
    ]);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/charts");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getTransactionsDataAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    const transactionsRaw = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    });

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    // Serialize Dates
    const transactions = transactionsRaw.map((tx) => ({
      ...tx,
      date: tx.date.toISOString(),
    }));

    return {
      success: true,
      data: {
        transactions,
        accounts,
      },
    };
  } catch (error) {
    console.error("Failed to fetch transactions data:", error);
    return { success: false, error: "Failed to fetch transactions data" };
  }
}
