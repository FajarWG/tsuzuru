"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { accountService } from "@/services/accountService";
import { CreateAccountInput, UpdateAccountInput } from "@/types/account";

export async function updateAccountBalanceWithHistoryAction(
  accountId: string,
  newBalance: number,
  reason?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await accountService.updateAccountBalanceWithHistory(accountId, newBalance, session.user.id, reason);

    revalidatePath("/");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    console.error("updateAccountBalanceWithHistoryAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to update account balance" };
  }
}

export async function updateAccountNameAction(accountId: string, name: string, isActive: boolean) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await accountService.updateAccountName(accountId, name, isActive, session.user.id);

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("updateAccountNameAction error:", err);
    return { success: false, error: "Failed to update account" };
  }
}

export async function createAccountAction(data: CreateAccountInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const account = await accountService.createAccount(data, session.user.id);

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: true, account };
  } catch (err) {
    console.error("createAccountAction error:", err);
    return { success: false, error: "Failed to create account" };
  }
}

export async function updateAccountAction(accountId: string, data: UpdateAccountInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const account = await accountService.updateAccount(accountId, data, session.user.id);

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
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await accountService.deleteAccount(accountId, session.user.id);

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    console.error("deleteAccountAction error:", err);
    return { success: false, error: "Failed to delete account" };
  }
}
