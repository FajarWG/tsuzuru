import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ChartsContainer from "@/components/charts/ChartsContainer";

export default async function ChartsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const today = new Date();

  // 1. Fetch data for the last 6 months (JPY only for consistent comparison)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const JPYTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      currency: "JPY",
      date: { gte: sixMonthsAgo },
      NOT: {
        category: "adjustment",
        description: { contains: "[tx_id:" },
      },
    },
    include: { account: true },
  });

  function resolveSplitGroupId(tx: { splitGroupId?: string | null; description?: string | null }): string | null {
    if (tx.splitGroupId) return tx.splitGroupId;
    const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
    return match ? match[1] : null;
  }

  const splitGroupIds: string[] = [];
  JPYTransactions.forEach((tx) => {
    const id = resolveSplitGroupId(tx);
    if (id) splitGroupIds.push(id);
  });

  const adjustmentsMap: Record<string, number> = {};
  if (splitGroupIds.length > 0) {
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

  const adjustedJPYTransactions = JPYTransactions.map((tx) => {
    const splitGroupId = resolveSplitGroupId(tx);
    let finalAmount = tx.amount;
    if (splitGroupId && adjustmentsMap[splitGroupId]) {
      finalAmount = Math.max(0, tx.amount - adjustmentsMap[splitGroupId]);
    }
    return {
      ...tx,
      amount: finalAmount,
    };
  });

  // Helper to get month name label (e.g. "Dec", "Jan")
  const getMonthLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  // Generate the last 6 months structure
  const monthlyOverviewMap: Record<string, { month: string; income: number; expense: number; net: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyOverviewMap[key] = {
      month: getMonthLabel(d),
      income: 0,
      expense: 0,
      net: 0,
    };
  }

  // Populate monthly overview trend
  adjustedJPYTransactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;
    if (monthlyOverviewMap[key]) {
      if (tx.type === "expense") {
        monthlyOverviewMap[key].expense += tx.amount;
      } else {
        monthlyOverviewMap[key].income += tx.amount;
      }
      monthlyOverviewMap[key].net = monthlyOverviewMap[key].income - monthlyOverviewMap[key].expense;
    }
  });

  const monthlyOverviewData = Object.values(monthlyOverviewMap);

  // 2. Fetch current month expenses (JPY only) for breakdown and allocations
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const currentMonthExpenses = adjustedJPYTransactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return tx.type === "expense" && txDate >= startOfMonth;
  });

  // Category breakdown
  let pocketMoneySpent = 0;
  let shoppingSpent = 0;
  let adjustmentSpent = 0;

  currentMonthExpenses.forEach((tx) => {
    if (tx.category === "pocket_money") pocketMoneySpent += tx.amount;
    else if (tx.category === "shopping") shoppingSpent += tx.amount;
    else if (tx.category === "adjustment") adjustmentSpent += tx.amount;
  });

  const categoryBreakdownData = [
    { name: "Pocket Money", value: pocketMoneySpent },
    { name: "Shopping", value: shoppingSpent },
    { name: "Adjustments", value: adjustmentSpent },
  ];

  // Account allocation spending
  const accountSpendingMap: Record<string, number> = {};
  currentMonthExpenses.forEach((tx) => {
    const accName = tx.account.name;
    accountSpendingMap[accName] = (accountSpendingMap[accName] || 0) + tx.amount;
  });

  const accountSpendingData = Object.entries(accountSpendingMap).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="flex flex-col flex-1">
      <ChartsContainer
        monthlyOverviewData={monthlyOverviewData}
        categoryBreakdownData={categoryBreakdownData}
        accountSpendingData={accountSpendingData}
      />
    </div>
  );
}
