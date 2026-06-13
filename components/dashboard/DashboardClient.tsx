"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import BalanceSummaryCard from "@/components/dashboard/BalanceSummaryCard";
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
import { getDashboardDataAction } from "@/lib/actions/dashboard";

interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
}

interface UserSettings {
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  budgetCurrency: string;
  isOnboarded: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  currency: string;
  type: string;
  date: string;
}

interface DashboardData {
  user: {
    name: string | null;
    image: string | null;
  };
  accounts: Account[];
  userSettings: UserSettings;
  monthlyExpenses: Transaction[];
  previousMonthlyExpenses: Transaction[];
}

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
        Monthly Insights (今月の支出 analysis)
      </h2>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const cached = localStorage.getItem("tsuzuru_dashboard_data");
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load cached dashboard data:", e);
    }
  }, []);

  // 2. stable sync function using ref to avoid stale closure issues
  const syncDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    syncDataRef.current = async () => {
      try {
        const res = await getDashboardDataAction();
        if (res.success && res.data) {
          const freshData = res.data as unknown as DashboardData;

          // Compare JPY and IDR balances to see if they've changed
          let isBalanceChanged = false;
          if (data) {
            const oldTotalJPY = data.accounts.filter((a) => a.currency === "JPY").reduce((s, a) => s + a.balance, 0);
            const oldTotalIDR = data.accounts.filter((a) => a.currency === "IDR").reduce((s, a) => s + a.balance, 0);

            const newTotalJPY = freshData.accounts.filter((a) => a.currency === "JPY").reduce((s, a) => s + a.balance, 0);
            const newTotalIDR = freshData.accounts.filter((a) => a.currency === "IDR").reduce((s, a) => s + a.balance, 0);

            if (oldTotalJPY !== newTotalJPY || oldTotalIDR !== newTotalIDR) {
              isBalanceChanged = true;
            }
          } else {
            // First load from database
            isBalanceChanged = true;
          }

          setData(freshData);
          localStorage.setItem("tsuzuru_dashboard_data", JSON.stringify(freshData));

          // Toast notifications based on state
          if (isBalanceChanged) {
            toast.success("Balances updated!", {
              description: "Data fetch complete and balances have been updated.",
            });
          }
        } else {
          toast.error(res.error || "Failed to fetch the latest data from the server.");
        }
      } catch (err) {
        console.error("Error syncing dashboard data:", err);
        toast.error("Failed to sync data with the server.");
      } finally {
        setLoading(false);
      }
    };
  }, [data]);

  // 3. Trigger sync on mount
  useEffect(() => {
    if (!isMounted) return;
    syncDataRef.current();
  }, [isMounted]);

  // 4. Trigger sync on transaction-added event
  useEffect(() => {
    if (!isMounted) return;

    const handleTransactionAdded = () => {
      syncDataRef.current();
    };

    window.addEventListener("transaction-added", handleTransactionAdded);
    return () => {
      window.removeEventListener("transaction-added", handleTransactionAdded);
    };
  }, [isMounted]);

  // If SSR or first visit (no cached data yet and loading is active)
  if (!isMounted || (!data && loading)) {
    return (
      <div className="flex flex-col gap-5">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="size-10 rounded-full" />
        </div>
        <BalanceSummarySkeleton />
        <BudgetProgressSkeleton />
        <MonthlyInsightsSkeleton />
      </div>
    );
  }

  // Use cached data or fallback defaults
  const activeData = data || {
    user: { name: "", image: null },
    accounts: [],
    userSettings: {
      monthlyBudget: 150000,
      pocketMoneyLimit: 40000,
      shoppingLimit: 60000,
      budgetCurrency: "JPY",
      isOnboarded: false,
    },
    monthlyExpenses: [],
    previousMonthlyExpenses: [],
  };

  // Header Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Balance calculations
  const accounts = activeData.accounts;
  const totalJPY = accounts.filter((a) => a.currency === "JPY").reduce((s, a) => s + a.balance, 0);
  const totalIDR = accounts.filter((a) => a.currency === "IDR").reduce((s, a) => s + a.balance, 0);

  // Budget calculations
  const settings = activeData.userSettings;
  const budgetExpectation = settings.monthlyBudget || 150000;
  const pocketLimit = settings.pocketMoneyLimit || 40000;
  const shoppingLimit = settings.shoppingLimit || 60000;
  const currency = settings.budgetCurrency || "JPY";

  const monthlyExpenses = activeData.monthlyExpenses;
  const actualSpentTotal = monthlyExpenses.reduce((s, t) => s + t.amount, 0);
  const actualPocketSpent = monthlyExpenses
    .filter((t) => t.category === "pocket_money")
    .reduce((s, t) => s + t.amount, 0);
  const actualShoppingSpent = monthlyExpenses
    .filter((t) => t.category === "shopping")
    .reduce((s, t) => s + t.amount, 0);

  const pocketPercent = Math.min((actualPocketSpent / pocketLimit) * 100, 100);
  const shoppingPercent = Math.min((actualShoppingSpent / shoppingLimit) * 100, 100);
  const pocketIsLow = (100 - pocketPercent) < 20;
  const budgetRemaining = Math.max(budgetExpectation - actualSpentTotal, 0);
  const pocketRemaining = Math.max(pocketLimit - actualPocketSpent, 0);
  const shoppingRemaining = Math.max(shoppingLimit - actualShoppingSpent, 0);
  const shoppingIsLow = (100 - shoppingPercent) < 20;

  // Monthly Insights calculations
  const previousMonthlyExpenses = activeData.previousMonthlyExpenses;
  const previousSpentTotal = previousMonthlyExpenses.reduce((s, t) => s + t.amount, 0);
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
            {greeting}, {activeData.user.name?.split(" ")[0] || "User"}
          </p>
          <h1 className="font-sans text-3xl font-bold tracking-wide text-primary mt-0.5">
            綴る
          </h1>
        </div>
        {activeData.user.image && (
          <Link href="/settings" className="cursor-pointer shrink-0">
            <img
              src={activeData.user.image}
              alt="Profile"
              className="size-10 rounded-full border border-border/80 shadow-sm hover:opacity-85 transition-opacity"
            />
          </Link>
        )}
      </div>

      {/* Balance Summary Card */}
      <AnimatedCard delay={0.05}>
        <BalanceSummaryCard
          accounts={accounts}
          totalJPY={totalJPY}
          totalIDR={totalIDR}
        />
      </AnimatedCard>

      {/* Budget Progress Card */}
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

      {/* Monthly Insights Card */}
      <AnimatedCard delay={0.15}>
        <MonthlyInsightsCard
          monthDelta={monthDelta}
          previousSpentTotal={previousSpentTotal}
          actualSpentTotal={actualSpentTotal}
          topCategory={topCategory}
          currency={currency}
        />
      </AnimatedCard>
    </div>
  );
}
