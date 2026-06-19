"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { settingsService } from "@/services/settingsService";
import { UpdateUserSettingsInput, OnboardingInput } from "@/types/settings";
import { AccountUpdateItem } from "@/types/account";

export async function updateUserSettingsAction(data: UpdateUserSettingsInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Always use session userId — never trust client-supplied userId
    await settingsService.updateUserSettings({ ...data, userId: session.user.id });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateAccountsAction(
  accounts: AccountUpdateItem[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // userId always from session — not from client
    await settingsService.updateAccounts(session.user.id, accounts);

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
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Override userId with session userId — never trust client-supplied userId
    await settingsService.completeOnboarding({ ...data, userId: session.user.id });

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
