"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreateTransactionInput {
  userId: string;
  accountId: string;
  type: "expense" | "income";
  amount: number;
  category: "pocket_money" | "shopping" | "income" | "template";
  subCategory?: string | null;
  mealNumber?: number | null;
  description?: string | null;
  date?: Date;
}

export async function createTransactionAction(data: CreateTransactionInput) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const transactionDate = data.date || new Date();

    // Calculate new balance
    let newBalance = account.balance;
    if (data.type === "expense") {
      newBalance -= data.amount;
    } else {
      newBalance += data.amount;
    }

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
