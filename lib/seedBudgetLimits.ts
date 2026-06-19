import { budgetRepository } from "@/repositories/budgetRepository";
import { settingsRepository } from "@/repositories/settingsRepository";

/**
 * Shared helper: seeds the default budget limits if none exist for the user.
 * Consolidates duplicated logic from dashboardService, budgetService, and settingsService.
 *
 * Returns the existing or newly created list of budget limits.
 */
export async function seedBudgetLimitsIfEmpty(userId: string) {
  let limits = await budgetRepository.findMany(userId);

  if (limits.length > 0) {
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
    { name: "monthly", label: "Monthly Expected Budget", limit: settings.monthlyBudget || 150000 },
    { name: "pocket_money", label: "Pocket Money", limit: settings.pocketMoneyLimit || 40000 },
    { name: "shopping", label: "Shopping", limit: settings.shoppingLimit || 60000 },
  ];

  await budgetRepository.createMany(
    defaultLimits.map((dl) => ({ userId, name: dl.name, label: dl.label, limit: dl.limit }))
  );

  return budgetRepository.findMany(userId);
}
