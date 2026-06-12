import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatJPY, formatIDR } from "@/lib/format";
import BalanceSummaryCard from "@/components/dashboard/BalanceSummaryCard";
import WelcomeDialog from "@/components/dashboard/WelcomeDialog";
import {
  IconChevronRight,
  IconWallet,
  IconTrendingUp,
  IconTools,
  IconDeviceLaptop,
  IconShirt,
  IconHome,
  IconHeart,
  IconHelp,
  IconPizza,
  IconGlass,
  IconBus,
  IconDeviceGamepad,
  IconCreditCard,
  IconAdjustments,
  IconCurrencyYen,
  IconSettings,
} from "@tabler/icons-react";

// Helper to determine the category icon
function getCategoryIcon(category: string, subCategory: string | null) {
  if (category === "income") return <IconTrendingUp className="size-5 text-primary" />;
  if (category === "template") return <IconTools className="size-5 text-amber-500" />;
  if (category === "adjustment") return <IconAdjustments className="size-5 text-blue-500" />;

  if (category === "pocket_money") {
    switch (subCategory) {
      case "food": return <IconPizza className="size-5 text-amber-600" />;
      case "drinks": return <IconGlass className="size-5 text-blue-500" />;
      case "transport": return <IconBus className="size-5 text-slate-500" />;
      case "entertainment": return <IconDeviceGamepad className="size-5 text-purple-500" />;
      default: return <IconWallet className="size-5 text-stone-500" />;
    }
  }

  if (category === "shopping") {
    switch (subCategory) {
      case "electronics": return <IconDeviceLaptop className="size-5 text-cyan-600" />;
      case "clothing": return <IconShirt className="size-5 text-pink-500" />;
      case "household": return <IconHome className="size-5 text-orange-500" />;
      case "health": return <IconHeart className="size-5 text-rose-500" />;
      default: return <IconCreditCard className="size-5 text-stone-500" />;
    }
  }

  return <IconHelp className="size-5 text-stone-400" />;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const userId = session.user.id;

  // Fetch settings & accounts
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const accounts = await prisma.account.findMany({ where: { userId, isActive: true } });

  // Calculate totals
  const totalJPY = accounts.filter((a) => a.currency === "JPY").reduce((s, a) => s + a.balance, 0);
  const totalIDR = accounts.filter((a) => a.currency === "IDR").reduce((s, a) => s + a.balance, 0);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Monthly spending calculations (JPY only for budget bars)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  const monthlyExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      currency: "JPY",
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const previousMonthlyExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      currency: "JPY",
      date: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
    },
  });

  const actualSpentTotal = monthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const actualPocketSpent = monthlyExpenses
    .filter((t) => t.category === "pocket_money")
    .reduce((s, t) => s + t.amount, 0);
  const actualShoppingSpent = monthlyExpenses
    .filter((t) => t.category === "shopping")
    .reduce((s, t) => s + t.amount, 0);
  const previousSpentTotal = previousMonthlyExpenses.reduce((s, t) => s + t.amount, 0);

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { account: true },
  });

  // Budget limits
  const budgetExpectation = settings?.monthlyBudget || 150000;
  const pocketLimit = settings?.pocketMoneyLimit || 40000;
  const shoppingLimit = settings?.shoppingLimit || 60000;

  const budgetPercent = Math.min((actualSpentTotal / budgetExpectation) * 100, 100);
  const pocketPercent = Math.min((actualPocketSpent / pocketLimit) * 100, 100);
  const shoppingPercent = Math.min((actualShoppingSpent / shoppingLimit) * 100, 100);
  const pocketIsLow = (100 - pocketPercent) < 20;
  const budgetRemaining = Math.max(budgetExpectation - actualSpentTotal, 0);
  const pocketRemaining = Math.max(pocketLimit - actualPocketSpent, 0);
  const monthDelta = actualSpentTotal - previousSpentTotal;
  const categoryTotals = monthlyExpenses.reduce<Record<string, number>>((totals, tx) => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    return totals;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground tracking-wide font-sans">
            {greeting}, {session.user.name?.split(" ")[0]}
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-primary mt-0.5">
            綴る
          </h1>
        </div>
        {session.user.image && (
          <Link href="/settings" className="cursor-pointer shrink-0">
            <img
              src={session.user.image}
              alt="Profile"
              className="size-10 rounded-full border border-border/80 shadow-sm hover:opacity-85 transition-opacity"
            />
          </Link>
        )}
      </div>

      {/* Balance Summary Card (client — collapsible + edit dialog) */}
      <BalanceSummaryCard
        accounts={accounts}
        totalJPY={totalJPY}
        totalIDR={totalIDR}
      />

      <WelcomeDialog />

      {/* Budget Progress Card */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Budget Progress (JPY)
        </h2>

        {/* Monthly Budget */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-foreground">Monthly Budget</span>
            <span className="text-muted-foreground">
              {formatJPY(actualSpentTotal)} / {formatJPY(budgetExpectation)}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${budgetPercent}%` }} />
          </div>
        </div>

        {/* Pocket Money */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-foreground">Pocket Money</span>
            <span className="text-muted-foreground">
              {formatJPY(actualPocketSpent)} / {formatJPY(pocketLimit)}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pocketIsLow ? "bg-destructive" : "bg-primary/60"}`}
              style={{ width: `${pocketPercent}%` }}
            />
          </div>
          {pocketIsLow && (
            <p className="text-[10px] text-destructive font-medium">
              ⚠️ Pocket money is critically low (&lt; 20% remaining)
            </p>
          )}
        </div>

        {/* Shopping */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-foreground">Shopping</span>
            <span className="text-muted-foreground">
              {formatJPY(actualShoppingSpent)} / {formatJPY(shoppingLimit)}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/70 rounded-full transition-all duration-500"
              style={{ width: `${shoppingPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Monthly Insights Card */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Monthly Insights (今月の洞察)
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {/* Remaining Budget */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
              <IconCurrencyYen className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Remaining Budget</span>
              <span className="text-sm font-bold text-foreground">
                {formatJPY(budgetRemaining)} <span className="text-xs font-normal text-muted-foreground">left of {formatJPY(budgetExpectation)}</span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {budgetRemaining > 0 
                  ? `${Math.round((budgetRemaining / budgetExpectation) * 100)}% of your monthly budget is still available.` 
                  : "You have spent or exceeded your monthly budget limits."}
              </p>
            </div>
          </div>

          {/* Spending Trend */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className={`p-2 rounded-lg shrink-0 ${monthDelta > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <IconTrendingUp className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Spending Trend</span>
              <span className="text-sm font-bold text-foreground">
                {monthDelta === 0 
                  ? "No change" 
                  : `${monthDelta > 0 ? "+" : ""}${formatJPY(monthDelta)}`}
                <span className="text-xs font-normal text-muted-foreground"> vs last month</span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {monthDelta > 0 
                  ? `You are spending more than last month's JPY total (¥${previousSpentTotal.toLocaleString()}).` 
                  : monthDelta < 0 
                    ? `You've spent less than last month's JPY total (¥${previousSpentTotal.toLocaleString()}) so far.`
                    : "Your spending matches last month's pattern exactly."}
              </p>
            </div>
          </div>

          {/* Top Category */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg shrink-0">
              <IconWallet className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Top Category</span>
              <span className="text-sm font-bold text-foreground capitalize">
                {topCategory ? topCategory[0].replace(/_/g, " ") : "None"}
                {topCategory && (
                  <span className="text-xs font-normal text-muted-foreground"> ({formatJPY(topCategory[1])})</span>
                )}
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {topCategory 
                  ? `${Math.round((topCategory[1] / Math.max(actualSpentTotal, 1)) * 100)}% of your JPY expenses went to ${topCategory[0].replace(/_/g, " ")}.`
                  : "No JPY transactions logged this month yet."}
              </p>
            </div>
          </div>

          {/* Pocket Money Remaining */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className={`p-2 rounded-lg shrink-0 ${pocketIsLow ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <IconPizza className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pocket Money</span>
              <span className="text-sm font-bold text-foreground">
                {formatJPY(pocketRemaining)} <span className="text-xs font-normal text-muted-foreground">left of {formatJPY(pocketLimit)}</span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {pocketIsLow 
                  ? "Pocket money is critically low (under 20% remaining). Consider reducing food/drink expenses." 
                  : `${Math.round((pocketRemaining / pocketLimit) * 100)}% of your pocket money is still available.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Recent Transactions
          </h2>
          <Link
            href="/transactions"
            className="text-xs text-primary hover:underline flex items-center font-medium"
          >
            See all
            <IconChevronRight className="size-4" />
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {recentTransactions.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-6 text-center text-xs text-muted-foreground">
              No transactions recorded yet.
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex justify-between items-center gap-3 shadow-xs hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl">
                    {getCategoryIcon(tx.category, tx.subCategory)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground leading-tight">
                      {tx.description || tx.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {tx.account.name} · {tx.subCategory || tx.category}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-0.5">
                  <span
                    className={`text-xs font-sans font-bold ${
                      tx.type === "expense" ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {tx.type === "expense" ? "-" : "+"}
                    {tx.currency === "JPY" ? formatJPY(tx.amount) : formatIDR(tx.amount)}
                  </span>
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {new Date(tx.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
