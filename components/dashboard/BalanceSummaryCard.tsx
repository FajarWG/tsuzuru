"use client";

import { useState } from "react";
import Link from "next/link";
import { formatJPY, formatIDR } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  IconBuildingBank,
  IconCreditCard,
  IconActivity,
  IconSettings,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconWallet,
  IconArrowUpRight,
  IconArrowDownRight,
  IconCoins,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
}

interface BalanceSummaryCardProps {
  accounts: Account[];
  totalJPY: number;
  totalIDR: number;
  actualIncomeTotal?: number;
  actualSpentTotal?: number;
  budgetCurrency?: string;
}

function AccountTypeIcon({ type }: { type: string }) {
  if (type === "investment")
    return (
      <IconActivity className="size-4 text-emerald-600 dark:text-emerald-400" />
    );
  if (type === "credit_card")
    return (
      <IconCreditCard className="size-4 text-rose-500 dark:text-rose-400" />
    );
  if (type === "ewallet")
    return <IconWallet className="size-4 text-amber-500 dark:text-amber-400" />;
  return (
    <IconBuildingBank className="size-4 text-blue-500 dark:text-blue-400" />
  );
}

export default function BalanceSummaryCard({
  accounts,
  totalJPY,
  totalIDR,
  actualIncomeTotal = 0,
  actualSpentTotal = 0,
  budgetCurrency = "JPY",
}: BalanceSummaryCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [hideBalances, setHideBalances] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tsuzuru_hide_balances") === "true";
    }
    return false;
  });
  const [hideSecondary, setHideSecondary] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tsuzuru_hide_secondary_currency") === "true";
    }
    return false;
  });

  const toggleHideBalances = () => {
    const nextState = !hideBalances;
    setHideBalances(nextState);
    localStorage.setItem("tsuzuru_hide_balances", String(nextState));
  };

  const toggleHideSecondary = () => {
    const nextState = !hideSecondary;
    setHideSecondary(nextState);
    localStorage.setItem("tsuzuru_hide_secondary_currency", String(nextState));
  };

  const activeAccounts = accounts.filter((a) => a.isActive);
  const showJPY =
    activeAccounts.some((a) => a.currency === "JPY") ||
    activeAccounts.length === 0;
  const showIDR = activeAccounts.some((a) => a.currency === "IDR");

  const hasJPY = showJPY && (!hideSecondary || budgetCurrency === "JPY");
  const hasIDR = showIDR && (!hideSecondary || budgetCurrency === "IDR");

  const renderGrowthLabel = () => {
    if (!actualIncomeTotal || actualIncomeTotal <= 0) return null;
    const netSavings = actualIncomeTotal - actualSpentTotal;
    const savingsRate = Math.round((netSavings / actualIncomeTotal) * 100);
    const isGrowth = netSavings > 0;

    if (netSavings === 0) return null;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[9px] font-bold shrink-0 align-baseline",
          isGrowth
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {isGrowth ? (
          <IconArrowUpRight className="size-2.5 stroke-[3]" />
        ) : (
          <IconArrowDownRight className="size-2.5 stroke-[3]" />
        )}
        {isGrowth ? `+${savingsRate}%` : `${savingsRate}%`}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Total Balance
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleHideBalances}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
              title={hideBalances ? "Show balance" : "Hide balance"}
            >
              {hideBalances ? (
                <IconEye className="size-3.5" />
              ) : (
                <IconEyeOff className="size-3.5" />
              )}
            </button>
            {showJPY && showIDR && (
              <button
                onClick={toggleHideSecondary}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                title={hideSecondary ? "Show all currencies" : "Show main currency only"}
              >
                <IconCoins className={cn("size-3.5 transition-opacity", hideSecondary ? "opacity-100 text-primary" : "opacity-45 hover:opacity-100")} />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showDetails ? (
            <>
              Hide <IconChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Show accounts <IconChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Totals */}
      <div
        className={cn(
          "grid gap-4",
          hasJPY && hasIDR
            ? "grid-cols-2 divide-x divide-border/40"
            : "grid-cols-1",
        )}
      >
        {hasJPY && (
          <div>
            <p className="text-[10px] text-muted-foreground tracking-wide font-medium">
              JPY Balance
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-sans font-bold tracking-tight text-foreground">
                {hideBalances ? (
                  "••••••"
                ) : (
                  <AnimatedNumber value={totalJPY} formatFn={formatJPY} />
                )}
              </span>
              {!hideBalances && budgetCurrency === "JPY" && renderGrowthLabel()}
            </div>
          </div>
        )}
        {hasIDR && (
          <div className={cn(hasJPY && "pl-4")}>
            <p className="text-[10px] text-muted-foreground tracking-wide font-medium">
              IDR Balance
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={cn(
                  "font-sans font-bold tracking-tight text-foreground",
                  hasJPY ? "text-xl" : "text-2xl",
                )}
              >
                {hideBalances ? (
                  "••••••"
                ) : (
                  <AnimatedNumber value={totalIDR} formatFn={formatIDR} />
                )}
              </span>
              {!hideBalances && budgetCurrency === "IDR" && renderGrowthLabel()}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible account list */}
      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 pt-3 border-t border-border/30">
              {activeAccounts
                .filter((acc) => !hideSecondary || acc.currency === budgetCurrency)
                .map((acc) => (
                <div
                  key={acc.id}
                  className="flex justify-between items-center text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-muted text-primary/80">
                      <AccountTypeIcon type={acc.type} />
                    </span>
                    <span className="font-medium text-foreground">
                      {acc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-muted-foreground">
                      {hideBalances ? (
                        "••••••"
                      ) : (
                        <AnimatedNumber
                          value={acc.balance}
                          formatFn={
                            acc.currency === "JPY" ? formatJPY : formatIDR
                          }
                        />
                      )}
                    </span>
                  </div>
                </div>
              ))}

              <Link href="/settings?tab=profile" className="mt-1">
                <Button
                  variant="outline"
                  className="w-full text-[10px] font-semibold tracking-wide gap-1.5 h-9 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center"
                >
                  <IconSettings className="size-3.5" />
                  Manage Profile & Accounts
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link href="/charts" className="w-full">
        <Button
          variant="outline"
          className="w-full text-[10px] font-semibold tracking-wide gap-1.5 h-9 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center"
        >
          <IconActivity className="size-3.5" />
          View Spending Analytics
        </Button>
      </Link>
    </div>
  );
}
