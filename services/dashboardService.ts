import { dashboardRepository } from "@/repositories/dashboardRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import { budgetRepository } from "@/repositories/budgetRepository";
import { seedBudgetLimitsIfEmpty } from "@/lib/seedBudgetLimits";

export const dashboardService = {
  async getDashboardData(userId: string, profile: { name: string | null; image: string | null }) {
    // 1. Fetch settings first to resolve currency
    let userSettings = await settingsRepository.findUserSettings(userId);
    if (!userSettings) {
      userSettings = await settingsRepository.createUserSettings({
        userId,
        monthlyBudget: 0,
        pocketMoneyLimit: 0,
        shoppingLimit: 0,
        budgetCurrency: "JPY",
        isOnboarded: false,
      });
    }

    const currency = userSettings.budgetCurrency || "JPY";

    // 2. Determine date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // 3. Fetch data via Repository
    const raw = await dashboardRepository.getRawDashboardData(
      userId,
      currency,
      startOfMonth,
      endOfMonth,
      startOfPreviousMonth,
      endOfPreviousMonth
    );

    let budgetLimits = raw.budgetLimits;

    // Seed default limits if none exist (first-time user)
    if (budgetLimits.length === 0) {
      budgetLimits = await seedBudgetLimitsIfEmpty(userId);
    }

    // Calculate dynamic spent amounts for each budget card
    const budgetLimitsWithSpent = budgetLimits.map((limit) => {
      let spent = 0;
      if (limit.name === "monthly") {
        spent = raw.monthlyExpensesRaw.reduce((sum, tx) => sum + tx.amount, 0);
      } else {
        spent = raw.monthlyExpensesRaw
          .filter((tx) => tx.category === limit.name)
          .reduce((sum, tx) => sum + tx.amount, 0);
      }
      return {
        id: limit.id,
        name: limit.name,
        label: limit.label,
        limit: limit.limit,
        spent,
      };
    });

    // Serialize Date objects to strings for compatibility with Server Action boundaries
    const monthlyExpenses = raw.monthlyExpensesRaw.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));

    const previousMonthlyExpenses = raw.previousMonthlyExpensesRaw.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));

    return {
      user: profile,
      accounts: raw.accounts,
      userSettings,
      monthlyExpenses,
      previousMonthlyExpenses,
      budgetLimits: budgetLimitsWithSpent,
    };
  },
};
