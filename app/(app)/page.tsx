import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import BalanceSummaryCard from "@/components/dashboard/BalanceSummaryCard";
import WelcomeDialog from "@/components/dashboard/WelcomeDialog";
import MonthlyInsightsCard from "@/components/dashboard/MonthlyInsightsCard";
import AnimatedCard from "@/components/ui/AnimatedCard";
import Skeleton from "@/components/ui/skeleton";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  IconCurrencyYen,
  IconPizza,
  IconShirt,
  IconEyeOff,
  IconChevronDown,
} from "@tabler/icons-react";

// Skeletons that show the layout & static labels immediately
function BalanceSummarySkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Total Balance
          </h2>
          <div className="text-muted-foreground/45 p-1">
            <IconEyeOff className="size-3.5" />
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          Show accounts <IconChevronDown className="size-3.5" />
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 divide-x divide-border/40">
        <div>
          <p className="text-[10px] text-muted-foreground tracking-wide font-medium">JPY Balance</p>
          <Skeleton className="h-8 w-28 mt-1" />
        </div>
        <div className="pl-4">
          <p className="text-[10px] text-muted-foreground tracking-wide font-medium">IDR Balance</p>
          <Skeleton className="h-7 w-24 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

function BudgetProgressSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Budget Progress (今月の予算状況)
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {/* Remaining Budget */}
        <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <IconCurrencyYen className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Remaining Budget</span>
            <Skeleton className="h-4 w-32 mt-0.5" />
            <Skeleton className="h-3 w-40 mt-1" />
          </div>
        </div>

        {/* Pocket Money Remaining */}
        <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <IconPizza className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pocket Money</span>
            <Skeleton className="h-4 w-28 mt-0.5" />
            <Skeleton className="h-3 w-44 mt-1" />
          </div>
        </div>

        {/* Shopping Remaining */}
        <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <IconShirt className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Shopping</span>
            <Skeleton className="h-4 w-28 mt-0.5" />
            <Skeleton className="h-3 w-44 mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyInsightsSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Monthly Insights (今月の支出分析)
      </h2>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

// Wrapper Server Components that resolve the parallel promises
interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
}

async function BalanceSummarySection({
  accountsPromise,
}: {
  accountsPromise: Promise<Account[]>;
}) {
  const accounts = await accountsPromise;
  const totalJPY = accounts.filter((a) => a.currency === "JPY").reduce((s, a) => s + a.balance, 0);
  const totalIDR = accounts.filter((a) => a.currency === "IDR").reduce((s, a) => s + a.balance, 0);

  return (
    <AnimatedCard delay={0.05}>
      <BalanceSummaryCard
        accounts={accounts}
        totalJPY={totalJPY}
        totalIDR={totalIDR}
      />
    </AnimatedCard>
  );
}

async function BudgetProgressSection({
  settingsPromise,
  monthlyExpensesPromise,
}: {
  settingsPromise: Promise<any>;
  monthlyExpensesPromise: Promise<any[]>;
}) {
  const [settings, monthlyExpenses] = await Promise.all([settingsPromise, monthlyExpensesPromise]);

  const budgetExpectation = settings?.monthlyBudget || 150000;
  const pocketLimit = settings?.pocketMoneyLimit || 40000;
  const shoppingLimit = settings?.shoppingLimit || 60000;
  const currency = settings?.budgetCurrency || "JPY";

  const actualSpentTotal = monthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const actualPocketSpent = monthlyExpenses
    .filter((t) => t.category === "pocket_money")
    .reduce((s, t) => s + t.amount, 0);
  const actualShoppingSpent = monthlyExpenses
    .filter((t) => t.category === "shopping")
    .reduce((s, t) => s + t.amount, 0);

  const budgetPercent = Math.min((actualSpentTotal / budgetExpectation) * 100, 100);
  const pocketPercent = Math.min((actualPocketSpent / pocketLimit) * 100, 100);
  const shoppingPercent = Math.min((actualShoppingSpent / shoppingLimit) * 100, 100);
  const pocketIsLow = (100 - pocketPercent) < 20;
  const budgetRemaining = Math.max(budgetExpectation - actualSpentTotal, 0);
  const pocketRemaining = Math.max(pocketLimit - actualPocketSpent, 0);
  const shoppingRemaining = Math.max(shoppingLimit - actualShoppingSpent, 0);
  const shoppingIsLow = (100 - shoppingPercent) < 20;

  return (
    <AnimatedCard delay={0.1}>
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Budget Progress (今月の予算状況)
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
                <AnimatedNumber value={budgetRemaining} currency={currency} />{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  left of <AnimatedNumber value={budgetExpectation} currency={currency} />
                </span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {budgetRemaining > 0 
                  ? `${Math.round((budgetRemaining / budgetExpectation) * 100)}% of your monthly budget is still available.` 
                  : "You have spent or exceeded your monthly budget limits."}
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
                <AnimatedNumber value={pocketRemaining} currency={currency} />{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  left of <AnimatedNumber value={pocketLimit} currency={currency} />
                </span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {pocketIsLow 
                  ? "Pocket money is critically low (under 20% remaining). Consider reducing food/drink expenses." 
                  : `${Math.round((pocketRemaining / pocketLimit) * 100)}% of your pocket money is still available.`}
              </p>
            </div>
          </div>

          {/* Shopping Remaining */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className={`p-2 rounded-lg shrink-0 ${shoppingIsLow ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <IconShirt className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Shopping</span>
              <span className="text-sm font-bold text-foreground">
                <AnimatedNumber value={shoppingRemaining} currency={currency} />{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  left of <AnimatedNumber value={shoppingLimit} currency={currency} />
                </span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                {shoppingIsLow 
                  ? "Shopping limit is critically low (under 20% remaining). Consider holding off on shopping purchases." 
                  : `${Math.round((shoppingRemaining / shoppingLimit) * 100)}% of your shopping budget is still available.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}

async function MonthlyInsightsSection({
  monthlyExpensesPromise,
  previousMonthlyExpensesPromise,
  currency,
}: {
  monthlyExpensesPromise: Promise<any[]>;
  previousMonthlyExpensesPromise: Promise<any[]>;
  currency: string;
}) {
  const [monthlyExpenses, previousMonthlyExpenses] = await Promise.all([
    monthlyExpensesPromise,
    previousMonthlyExpensesPromise,
  ]);

  const actualSpentTotal = monthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const previousSpentTotal = previousMonthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const monthDelta = actualSpentTotal - previousSpentTotal;

  const categoryTotals = monthlyExpenses.reduce<Record<string, number>>((totals, tx) => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    return totals;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <AnimatedCard delay={0.15}>
      <MonthlyInsightsCard
        monthDelta={monthDelta}
        previousSpentTotal={previousSpentTotal}
        actualSpentTotal={actualSpentTotal}
        topCategory={topCategory}
        currency={currency}
      />
    </AnimatedCard>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const userId = session.user.id;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch settings first to determine main currency
  let userSettings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!userSettings) {
    userSettings = await prisma.userSettings.create({
      data: {
        userId,
        monthlyBudget: 150000,
        pocketMoneyLimit: 40000,
        shoppingLimit: 60000,
        budgetCurrency: "JPY",
      },
    });
  }
  const currency = userSettings.budgetCurrency || "JPY";

  // Parallel promises for lazy streaming
  const accountsPromise = prisma.account.findMany({ where: { userId, isActive: true } });
  const settingsPromise = Promise.resolve(userSettings);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  const monthlyExpensesPromise = prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      currency: currency,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const previousMonthlyExpensesPromise = prisma.transaction.findMany({
    where: {
      userId,
      type: "expense",
      currency: currency,
      date: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground tracking-wide font-sans">
            {greeting}, {session.user.name?.split(" ")[0]}
          </p>
          <h1 className="font-sans text-3xl font-bold tracking-wide text-primary mt-0.5">
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

      {/* Balance Summary Card (client — collapsible) */}
      <Suspense fallback={<BalanceSummarySkeleton />}>
        <BalanceSummarySection accountsPromise={accountsPromise} />
      </Suspense>

      <WelcomeDialog />

      {/* Budget Progress Card (formatted like insights) */}
      <Suspense fallback={<BudgetProgressSkeleton />}>
        <BudgetProgressSection
          settingsPromise={settingsPromise}
          monthlyExpensesPromise={monthlyExpensesPromise}
        />
      </Suspense>

      {/* Monthly Insights Card (client-side collapsible/dialog) */}
      <Suspense fallback={<MonthlyInsightsSkeleton />}>
        <MonthlyInsightsSection
          monthlyExpensesPromise={monthlyExpensesPromise}
          previousMonthlyExpensesPromise={previousMonthlyExpensesPromise}
          currency={currency}
        />
      </Suspense>
    </div>
  );
}
