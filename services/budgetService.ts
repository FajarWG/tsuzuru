import { budgetRepository } from "@/repositories/budgetRepository";
import { settingsRepository } from "@/repositories/settingsRepository";

export const budgetService = {
  async getBudgetLimits(userId: string) {
    let limits = await budgetRepository.findMany(userId);

    // If no limits exist yet, seed the default 3 from UserSettings or system defaults
    if (limits.length === 0) {
      let settings = await settingsRepository.findUserSettings(userId);
      if (!settings) {
        settings = await settingsRepository.createUserSettings({
          userId,
          monthlyBudget: 150000,
          pocketMoneyLimit: 40000,
          shoppingLimit: 60000,
          budgetCurrency: "JPY",
          isOnboarded: false,
        });
      }

      const defaultLimits = [
        { name: "monthly", label: "Monthly Expected Budget", limit: settings.monthlyBudget || 150000 },
        { name: "pocket_money", label: "Pocket Money", limit: settings.pocketMoneyLimit || 40000 },
        { name: "shopping", label: "Shopping", limit: settings.shoppingLimit || 60000 },
      ];

      await budgetRepository.createMany(
        defaultLimits.map((dl) => ({
          userId,
          name: dl.name,
          label: dl.label,
          limit: dl.limit,
        }))
      );

      limits = await budgetRepository.findMany(userId);
    }

    return limits;
  },

  async addBudgetLimit(label: string, limit: number, userId: string) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) throw new Error("Label is required");
    if (limit < 0) throw new Error("Limit must be a positive number");

    // Generate a unique slug name for the category matching
    const name = trimmedLabel
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!name || name === "monthly" || name === "income" || name === "template" || name === "adjustment") {
      throw new Error("Invalid category name. Please choose a different label.");
    }

    // Check if category name already exists
    const existing = await budgetRepository.findFirstByName(userId, name);
    if (existing) {
      throw new Error("A budget limit for this category already exists");
    }

    return budgetRepository.create({
      userId,
      name,
      label: trimmedLabel,
      limit,
    });
  },

  async updateBudgetLimit(id: string, label: string, limit: number, userId: string) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) throw new Error("Label is required");
    if (limit < 0) throw new Error("Limit must be a positive number");

    const existing = await budgetRepository.findFirstById(id, userId);
    if (!existing) throw new Error("Budget limit not found");

    // Prevent changing name slug for system defaults (monthly, pocket_money, shopping) to keep functionality
    const isSystemDefault = ["monthly", "pocket_money", "shopping"].includes(existing.name);
    const updatedName = isSystemDefault
      ? existing.name
      : trimmedLabel
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

    const updated = await budgetRepository.update(id, userId, {
      label: trimmedLabel,
      limit,
      name: updatedName,
    });

    // Sync back to UserSettings columns for backwards compatibility and fallback support
    if (existing.name === "monthly") {
      await settingsRepository.updateUserSettings(userId, { monthlyBudget: limit });
    } else if (existing.name === "pocket_money") {
      await settingsRepository.updateUserSettings(userId, { pocketMoneyLimit: limit });
    } else if (existing.name === "shopping") {
      await settingsRepository.updateUserSettings(userId, { shoppingLimit: limit });
    }

    return updated;
  },

  async deleteBudgetLimit(id: string, userId: string) {
    const existing = await budgetRepository.findFirstById(id, userId);
    if (!existing) throw new Error("Budget limit not found");

    if (existing.name === "monthly") {
      throw new Error("The Monthly Expected Budget limit cannot be deleted");
    }

    await budgetRepository.delete(id, userId);

    // Reset fallback values in UserSettings if system defaults are deleted
    if (existing.name === "pocket_money") {
      await settingsRepository.updateUserSettings(userId, { pocketMoneyLimit: 0 });
    } else if (existing.name === "shopping") {
      await settingsRepository.updateUserSettings(userId, { shoppingLimit: 0 });
    }
  },
};
