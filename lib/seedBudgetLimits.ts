import { budgetRepository } from "@/repositories/budgetRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import {
  LIVING_EXPENSES_DEFAULT_SUBCATS,
  PERSONAL_SPENDING_DEFAULT_SUBCATS,
} from "@/lib/categories";

/**
 * Shared helper: seeds the default budget limits if none exist for the user.
 * Also handles migration from legacy slugs (pocket_money, shopping) →
 * new slugs (living_expenses, personal_spending) for existing users.
 *
 * Returns the existing or newly created list of budget limits.
 */
export async function seedBudgetLimitsIfEmpty(userId: string) {
  let limits = await budgetRepository.findMany(userId);

  // --- Migration: rename legacy slugs for existing users ---
  if (limits.length > 0) {
    const pocketMoneyRow = limits.find((l) => l.name === "pocket_money");
    const shoppingRow = limits.find((l) => l.name === "shopping");

    if (pocketMoneyRow) {
      await budgetRepository.update(pocketMoneyRow.id, userId, {
        name: "living_expenses",
        label: "Living Expenses",
        subCategories: LIVING_EXPENSES_DEFAULT_SUBCATS as unknown as never,
      });
    }

    if (shoppingRow) {
      await budgetRepository.update(shoppingRow.id, userId, {
        name: "personal_spending",
        label: "Personal Spending",
        subCategories: PERSONAL_SPENDING_DEFAULT_SUBCATS as unknown as never,
      });
    }

    // Re-fetch if we did any migration
    if (pocketMoneyRow || shoppingRow) {
      limits = await budgetRepository.findMany(userId);
    }

    return limits;
  }

  // Fetch user settings to use their configured budget values as defaults
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
    {
      name: "monthly",
      label: "Monthly Expected Budget",
      limit: settings.monthlyBudget || 150000,
      subCategories: null,
    },
    {
      name: "living_expenses",
      label: "Living Expenses",
      limit: settings.pocketMoneyLimit || 40000,
      subCategories: LIVING_EXPENSES_DEFAULT_SUBCATS,
    },
    {
      name: "personal_spending",
      label: "Personal Spending",
      limit: settings.shoppingLimit || 60000,
      subCategories: PERSONAL_SPENDING_DEFAULT_SUBCATS,
    },
  ];

  await budgetRepository.createMany(
    defaultLimits.map((dl) => ({
      userId,
      name: dl.name,
      label: dl.label,
      limit: dl.limit,
      subCategories: dl.subCategories as unknown as never,
    }))
  );

  return budgetRepository.findMany(userId);
}
