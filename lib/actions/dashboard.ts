"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardDataAction() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // 1. Fetch user settings
    let userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId,
          monthlyBudget: 0,
          pocketMoneyLimit: 0,
          shoppingLimit: 0,
          budgetCurrency: "JPY",
          isOnboarded: false,
        },
      });
    }

    const currency = userSettings.budgetCurrency || "JPY";

    // 2. Fetch active accounts
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });

    // 2b. Fetch budget limits (with fallback seeding)
    let budgetLimits = await prisma.budgetLimit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (budgetLimits.length === 0) {
      const defaultLimits = [
        { name: "monthly", label: "Monthly Expected Budget", limit: userSettings.monthlyBudget || 150000 },
        { name: "pocket_money", label: "Pocket Money", limit: userSettings.pocketMoneyLimit || 40000 },
        { name: "shopping", label: "Shopping", limit: userSettings.shoppingLimit || 60000 },
      ];

      await prisma.budgetLimit.createMany({
        data: defaultLimits.map((dl) => ({
          userId,
          name: dl.name,
          label: dl.label,
          limit: dl.limit,
        })),
      });

      budgetLimits = await prisma.budgetLimit.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
    }

    // 3. Fetch monthly transactions (expenses)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const monthlyExpensesRaw = await prisma.transaction.findMany({
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
    });

    const previousMonthlyExpensesRaw = await prisma.transaction.findMany({
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
    });

    // Calculate dynamic spent amounts for each budget card
    const budgetLimitsWithSpent = budgetLimits.map((limit) => {
      let spent = 0;
      if (limit.name === "monthly") {
        spent = monthlyExpensesRaw.reduce((sum, tx) => sum + tx.amount, 0);
      } else {
        spent = monthlyExpensesRaw
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
    const monthlyExpenses = monthlyExpensesRaw.map(t => ({
      ...t,
      date: t.date.toISOString(),
    }));

    const previousMonthlyExpenses = previousMonthlyExpensesRaw.map(t => ({
      ...t,
      date: t.date.toISOString(),
    }));

    return {
      success: true,
      data: {
        user: {
          name: session.user.name || null,
          image: session.user.image || null,
        },
        accounts,
        userSettings,
        monthlyExpenses,
        previousMonthlyExpenses,
        budgetLimits: budgetLimitsWithSpent,
      },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}
