import { prisma } from "@/lib/prisma";

function resolveSplitGroupId(tx: { splitGroupId?: string | null; description?: string | null }): string | null {
  if (tx.splitGroupId) return tx.splitGroupId;
  const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
  return match ? match[1] : null;
}

export const dashboardRepository = {
  // Let's keep it simple or delegate to other queries if needed.
  // We can write dedicated query functions here to fetch everything for dashboard in one place.
  async getRawDashboardData(userId: string, currency: string, startOfMonth: Date, endOfMonth: Date, startOfPreviousMonth: Date, endOfPreviousMonth: Date) {
    const [userSettings, accounts, budgetLimits, monthlyTransactionsRaw, previousMonthlyTransactionsRaw] = await Promise.all([
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
          currency: currency,
          date: { gte: startOfMonth, lte: endOfMonth },
          NOT: {
            category: "adjustment",
            description: { contains: "[tx_id:" },
          },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          currency: true,
          type: true,
          date: true,
          description: true,
          splitGroupId: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          currency: currency,
          date: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
          NOT: {
            category: "adjustment",
            description: { contains: "[tx_id:" },
          },
        },
        select: {
          id: true,
          amount: true,
          category: true,
          currency: true,
          type: true,
          date: true,
          description: true,
          splitGroupId: true,
        },
      }),
    ]);

    // Collect all unique splitGroupIds from both datasets to look up adjustments
    const splitGroupIds: string[] = [];
    [...monthlyTransactionsRaw, ...previousMonthlyTransactionsRaw].forEach((tx) => {
      const id = resolveSplitGroupId(tx);
      if (id) splitGroupIds.push(id);
    });

    const adjustmentsMap: Record<string, number> = {};
    if (splitGroupIds.length > 0) {
      // Fetch adjustment transactions linked by splitGroupId OR legacy description pattern
      const adjustments = await prisma.transaction.findMany({
        where: {
          userId,
          category: "adjustment",
          OR: [
            { splitGroupId: { in: splitGroupIds } },
            ...splitGroupIds.map((id) => ({
              description: { contains: `[tx_id:${id}]` },
            })),
          ],
        },
        select: {
          amount: true,
          description: true,
          splitGroupId: true,
        },
      });

      adjustments.forEach((tx) => {
        const id = resolveSplitGroupId(tx);
        if (id) {
          adjustmentsMap[id] = (adjustmentsMap[id] || 0) + tx.amount;
        }
      });
    }

    // Map raw transactions to adjusted ones
    const adjustTransactionList = (txList: typeof monthlyTransactionsRaw) => {
      return txList.map((tx) => {
        const splitGroupId = resolveSplitGroupId(tx);
        let finalAmount = tx.amount;
        if (splitGroupId && adjustmentsMap[splitGroupId]) {
          finalAmount = Math.max(0, tx.amount - adjustmentsMap[splitGroupId]);
        }
        return {
          id: tx.id,
          amount: finalAmount,
          category: tx.category,
          currency: tx.currency,
          type: tx.type,
          date: tx.date,
        };
      });
    };

    const monthlyAdjusted = adjustTransactionList(monthlyTransactionsRaw);
    const previousMonthlyAdjusted = adjustTransactionList(previousMonthlyTransactionsRaw);

    const monthlyExpensesAdjusted = monthlyAdjusted.filter(tx => tx.type === "expense");
    const monthlyIncomeAdjusted = monthlyAdjusted.filter(tx => tx.type === "income");

    const previousMonthlyExpensesAdjusted = previousMonthlyAdjusted.filter(tx => tx.type === "expense");
    const previousMonthlyIncomeAdjusted = previousMonthlyAdjusted.filter(tx => tx.type === "income");

    return {
      userSettings,
      accounts,
      budgetLimits,
      monthlyExpensesRaw: monthlyExpensesAdjusted,
      previousMonthlyExpensesRaw: previousMonthlyExpensesAdjusted,
      monthlyIncomeRaw: monthlyIncomeAdjusted,
      previousMonthlyIncomeRaw: previousMonthlyIncomeAdjusted,
    };
  },
};
