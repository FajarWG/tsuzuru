"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { transactionService } from "@/services/transactionService";
import { CreateTransactionInput, UpdateTransactionInput } from "@/types/transaction";

function triggerRevalidation() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/charts");
  revalidatePath("/settings");
  revalidatePath("/bill-friends");
}

export async function createTransactionAction(data: CreateTransactionInput) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const newTx = await transactionService.createTransaction(data, session.user.id);

    triggerRevalidation();

    return { success: true, transaction: newTx };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTransactionAction(data: UpdateTransactionInput) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Ensure the input matches the authorized user
    await transactionService.updateTransaction({
      ...data,
      userId: session.user.id,
    }, session.user.id);

    triggerRevalidation();

    return { success: true };
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTransactionAction(transactionId: string, userId: string) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id || session.user.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await transactionService.deleteTransaction(transactionId, session.user.id);

    triggerRevalidation();

    return { success: true };
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getTransactionsDataAction() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await transactionService.getTransactionsData(session.user.id);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch transactions data:", error);
    return { success: false, error: "Failed to fetch transactions data" };
  }
}
