"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface UpdateUserSettingsInput {
  userId: string;
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  budgetCurrency?: string;
}

export async function updateUserSettingsAction(data: UpdateUserSettingsInput) {
  try {
    await prisma.userSettings.update({
      where: { userId: data.userId },
      data: {
        monthlyBudget: data.monthlyBudget,
        pocketMoneyLimit: data.pocketMoneyLimit,
        shoppingLimit: data.shoppingLimit,
        budgetCurrency: data.budgetCurrency,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

interface AccountUpdateItem {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
}

export async function updateAccountsAction(
  userId: string,
  accounts: AccountUpdateItem[]
) {
  try {
    await prisma.$transaction(
      accounts.map((acc) =>
        prisma.account.update({
          where: { id: acc.id, userId },
          data: {
            name: acc.name,
            balance: acc.balance,
            isActive: acc.isActive,
          },
        })
      )
    );

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/monthly-templates");

    return { success: true };
  } catch (error) {
    console.error("Failed to update accounts:", error);
    return { success: false, error: (error as Error).message };
  }
}
