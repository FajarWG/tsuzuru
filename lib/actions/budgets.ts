"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { budgetService } from "@/services/budgetService";
import { SubCatOption } from "@/lib/categories";

export async function getBudgetLimitsAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const limits = await budgetService.getBudgetLimits(session.user.id);

    return { success: true, data: limits };
  } catch (err) {
    console.error("getBudgetLimitsAction error:", err);
    return { success: false, error: "Failed to load budget limits" };
  }
}

export async function addBudgetLimitAction(label: string, limit: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const newLimit = await budgetService.addBudgetLimit(label, limit, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, data: newLimit };
  } catch (err) {
    console.error("addBudgetLimitAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to create budget limit" };
  }
}

export async function updateBudgetLimitAction(id: string, label: string, limit: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const updated = await budgetService.updateBudgetLimit(id, label, limit, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (err) {
    console.error("updateBudgetLimitAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to update budget limit" };
  }
}

export async function updateBudgetSubCategoriesAction(
  id: string,
  subCategories: SubCatOption[]
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const updated = await budgetService.updateBudgetSubCategories(
      id,
      subCategories,
      session.user.id
    );

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (err) {
    console.error("updateBudgetSubCategoriesAction error:", err);
    return {
      success: false,
      error: (err as Error).message || "Failed to update subcategories",
    };
  }
}

export async function deleteBudgetLimitAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await budgetService.deleteBudgetLimit(id, session.user.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("deleteBudgetLimitAction error:", err);
    return { success: false, error: (err as Error).message || "Failed to delete budget limit" };
  }
}
