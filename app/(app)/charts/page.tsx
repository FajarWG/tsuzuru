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
    },
    include: { account: true },
  });

  // Helper to get month name label (e.g. "Dec", "Jan")
  const getMonthLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  // Generate the last 6 months structure
  const monthlyOverviewMap: Record<string, { month: string; income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyOverviewMap[key] = {
      month: getMonthLabel(d),
      income: 0,
      expense: 0,
    };
  }

  // Populate monthly overview trend
  JPYTransactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;
    if (monthlyOverviewMap[key]) {
      if (tx.type === "expense") {
        monthlyOverviewMap[key].expense += tx.amount;
      } else {
        monthlyOverviewMap[key].income += tx.amount;
      }
    }
  });

  const monthlyOverviewData = Object.values(monthlyOverviewMap);

  // 2. Fetch current month expenses (JPY only) for breakdown and allocations
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const currentMonthExpenses = JPYTransactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return tx.type === "expense" && txDate >= startOfMonth;
  });

  // Category breakdown
  let pocketMoneySpent = 0;
  let shoppingSpent = 0;
  let templateSpent = 0;

  currentMonthExpenses.forEach((tx) => {
    if (tx.category === "pocket_money") pocketMoneySpent += tx.amount;
    else if (tx.category === "shopping") shoppingSpent += tx.amount;
    else if (tx.category === "template") templateSpent += tx.amount;
  });

  const categoryBreakdownData = [
    { name: "Pocket Money", value: pocketMoneySpent },
    { name: "Shopping", value: shoppingSpent },
    { name: "Templates (Bills)", value: templateSpent },
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

  // 3. Jajan Detail: Average meals per day this month (from all food pocket money expenses)
  const foodTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      category: "pocket_money",
      subCategory: "food",
      type: "expense",
      date: { gte: startOfMonth },
    },
  });

  const totalFoodMeals = foodTransactions.length;
  const daysElapsed = today.getDate(); // Number of days elapsed in the current month
  const avgMealsPerDay = totalFoodMeals / daysElapsed;

  return (
    <div className="flex flex-col flex-1">
      <ChartsContainer
        monthlyOverviewData={monthlyOverviewData}
        categoryBreakdownData={categoryBreakdownData}
        accountSpendingData={accountSpendingData}
        avgMealsPerDay={avgMealsPerDay}
        totalFoodMeals={totalFoodMeals}
      />
    </div>
  );
}
