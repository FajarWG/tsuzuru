import { dashboardRepository } from "@/repositories/dashboardRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
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
        for (const tx of raw.monthlyExpensesRaw) {
          // For receipt transactions with per-item categories, attribute each item
          // to its own category instead of the whole transaction amount.
          if (
            tx.isReceipt &&
            tx.receiptItems &&
            Array.isArray(tx.receiptItems) &&
            tx.receiptItems.length > 0
          ) {
            const items = tx.receiptItems as {
              name: string;
              price: number;
              category?: string;
              subCategory?: string;
            }[];
            // Sum prices of items that belong to this budget category
            const itemSubtotalForCat = items.reduce((s, item) => {
              const itemCat = item.category ?? tx.category;
              return itemCat === limit.name ? s + (item.price ?? 0) : s;
            }, 0);

            if (itemSubtotalForCat > 0) {
              // Calculate the overall items subtotal (before tax)
              const overallSubtotal = items.reduce((s, item) => s + (item.price ?? 0), 0);
              // Apply proportional tax: tx.amount may include tax
              // proportion = itemSubtotalForCat / overallSubtotal
              const proportion = overallSubtotal > 0 ? itemSubtotalForCat / overallSubtotal : 0;
              spent += Math.round(tx.amount * proportion);
            }
          } else {
            // Non-receipt: use tx.category as before
            if (tx.category === limit.name) {
              spent += tx.amount;
            }
          }
        }
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

    const monthlyIncome = raw.monthlyIncomeRaw.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));

    const previousMonthlyIncome = raw.previousMonthlyIncomeRaw.map((t) => ({
      ...t,
      date: t.date.toISOString(),
    }));

    return {
      user: profile,
      accounts: raw.accounts,
      userSettings,
      monthlyExpenses,
      previousMonthlyExpenses,
      monthlyIncome,
      previousMonthlyIncome,
      budgetLimits: budgetLimitsWithSpent,
    };
  },
};
