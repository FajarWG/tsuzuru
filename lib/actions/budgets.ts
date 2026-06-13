"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Fetch all budget limits for the current user, auto-seeding defaults if none exist
export async function getBudgetLimitsAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    let limits = await prisma.budgetLimit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // If no limits exist yet, seed the default 3 from UserSettings or system defaults
    if (limits.length === 0) {
      let settings = await prisma.userSettings.findUnique({ where: { userId } });
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            monthlyBudget: 150000,
            pocketMoneyLimit: 40000,
            shoppingLimit: 60000,
            budgetCurrency: "JPY",
            isOnboarded: false,
          },
        });
      }

      const defaultLimits = [
        { name: "monthly", label: "Monthly Expected Budget", limit: settings.monthlyBudget || 150000 },
        { name: "pocket_money", label: "Pocket Money", limit: settings.pocketMoneyLimit || 40000 },
        { name: "shopping", label: "Shopping", limit: settings.shoppingLimit || 60000 },
      ];

      await prisma.budgetLimit.createMany({
        data: defaultLimits.map((dl) => ({
          userId,
          name: dl.name,
          label: dl.label,
          limit: dl.limit,
        })),
      });

      limits = await prisma.budgetLimit.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
    }

    return { success: true, data: limits };
  } catch (err) {
    console.error("getBudgetLimitsAction error:", err);
    return { success: false, error: "Failed to load budget limits" };
  }
}

// Add a new custom budget limit card
export async function addBudgetLimitAction(label: string, limit: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { success: false, error: "Label is required" };
  if (limit < 0) return { success: false, error: "Limit must be a positive number" };

  // Generate a unique slug name for the category matching
  const name = trimmedLabel
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!name || name === "monthly" || name === "income" || name === "template") {
    return { success: false, error: "Invalid category name. Please choose a different label." };
  }

  try {
    // Check if category name already exists
    const existing = await prisma.budgetLimit.findFirst({
      where: { userId, name },
    });
    if (existing) {
      return { success: false, error: "A budget limit for this category already exists" };
    }

    const newLimit = await prisma.budgetLimit.create({
      data: {
        userId,
        name,
        label: trimmedLabel,
        limit,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, data: newLimit };
  } catch (err) {
    console.error("addBudgetLimitAction error:", err);
    return { success: false, error: "Failed to create budget limit" };
  }
}

// Update a budget limit card
export async function updateBudgetLimitAction(id: string, label: string, limit: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { success: false, error: "Label is required" };
  if (limit < 0) return { success: false, error: "Limit must be a positive number" };

  try {
    const existing = await prisma.budgetLimit.findFirst({
      where: { id, userId },
    });
    if (!existing) return { success: false, error: "Budget limit not found" };

    // Prevent changing name slug for system defaults (monthly, pocket_money, shopping) to keep functionality
    const isSystemDefault = ["monthly", "pocket_money", "shopping"].includes(existing.name);
    const updatedName = isSystemDefault
      ? existing.name
      : trimmedLabel
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

    const updated = await prisma.budgetLimit.update({
      where: { id, userId },
      data: {
        label: trimmedLabel,
        limit,
        name: updatedName,
      },
    });

    // Sync back to UserSettings columns for backwards compatibility and fallback support
    if (existing.name === "monthly") {
      await prisma.userSettings.update({ where: { userId }, data: { monthlyBudget: limit } });
    } else if (existing.name === "pocket_money") {
      await prisma.userSettings.update({ where: { userId }, data: { pocketMoneyLimit: limit } });
    } else if (existing.name === "shopping") {
      await prisma.userSettings.update({ where: { userId }, data: { shoppingLimit: limit } });
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (err) {
    console.error("updateBudgetLimitAction error:", err);
    return { success: false, error: "Failed to update budget limit" };
  }
}

// Delete a custom budget limit card
export async function deleteBudgetLimitAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const existing = await prisma.budgetLimit.findFirst({
      where: { id, userId },
    });
    if (!existing) return { success: false, error: "Budget limit not found" };

    if (existing.name === "monthly") {
      return { success: false, error: "The Monthly Expected Budget limit cannot be deleted" };
    }

    await prisma.budgetLimit.delete({
      where: { id, userId },
    });

    // Reset fallback values in UserSettings if system defaults are deleted
    if (existing.name === "pocket_money") {
      await prisma.userSettings.update({ where: { userId }, data: { pocketMoneyLimit: 0 } });
    } else if (existing.name === "shopping") {
      await prisma.userSettings.update({ where: { userId }, data: { shoppingLimit: 0 } });
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("deleteBudgetLimitAction error:", err);
    return { success: false, error: "Failed to delete budget limit" };
  }
}
