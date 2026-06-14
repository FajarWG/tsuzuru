"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { settingsService } from "@/services/settingsService";
import { UpdateUserSettingsInput, OnboardingInput } from "@/types/settings";
import { AccountUpdateItem } from "@/types/account";

export async function updateUserSettingsAction(data: UpdateUserSettingsInput) {
  try {
    await settingsService.updateUserSettings(data);

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateAccountsAction(
  userId: string,
  accounts: AccountUpdateItem[]
) {
  try {
    await settingsService.updateAccounts(userId, accounts);

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

export async function resetUserSettingsAndDataAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await settingsService.resetUserSettingsAndData(session.user.id);

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/monthly-templates");

    return { success: true };
  } catch (error) {
    console.error("Failed to reset user settings and data:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function completeOnboardingAction(data: OnboardingInput) {
  try {
    await settingsService.completeOnboarding(data);

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getUserSettingsDataAction() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await settingsService.getUserSettingsData(session.user.id, {
      name: session.user.name || null,
      email: session.user.email || null,
      image: session.user.image || null,
    });

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Failed to fetch settings data:", error);
    return { success: false, error: "Failed to fetch settings data" };
  }
}
