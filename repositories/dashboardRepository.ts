import { prisma } from "@/lib/prisma";

export const dashboardRepository = {
  // Let's keep it simple or delegate to other queries if needed.
  // We can write dedicated query functions here to fetch everything for dashboard in one place.
  async getRawDashboardData(userId: string, currency: string, startOfMonth: Date, endOfMonth: Date, startOfPreviousMonth: Date, endOfPreviousMonth: Date) {
    const [userSettings, accounts, budgetLimits, monthlyExpensesRaw, previousMonthlyExpensesRaw] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.account.findMany({
        where: { userId, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.budgetLimit.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: "expense",
          currency: currency,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          currency: true,
          type: true,
          date: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: "expense",
          currency: currency,
          date: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          currency: true,
          type: true,
          date: true,
        },
      }),
    ]);

    return {
      userSettings,
      accounts,
      budgetLimits,
      monthlyExpensesRaw,
      previousMonthlyExpensesRaw,
    };
  },
};
