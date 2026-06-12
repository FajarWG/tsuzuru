"use client";

import { useState } from "react";
import { formatJPY, formatIDR } from "@/lib/format";
import {
  IconTrendingUp,
  IconWallet,
  IconCalendar,
  IconArrowUpRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MonthlyInsightsCardProps {
  monthDelta: number;
  previousSpentTotal: number;
  actualSpentTotal: number;
  topCategory: [string, number] | undefined;
  currency?: string;
}

export default function MonthlyInsightsCard({
  monthDelta,
  previousSpentTotal,
  actualSpentTotal,
  topCategory,
  currency = "JPY",
}: MonthlyInsightsCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate daily spending rate insights
  const today = new Date();
  const currentDay = Math.max(today.getDate(), 1);
  const dailyAverage = actualSpentTotal / currentDay;
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedSpent = dailyAverage * totalDaysInMonth;

  const formatAmount = (amount: number) => {
    return currency === "JPY" ? formatJPY(amount) : formatIDR(amount);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex items-center justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Monthly Insights (今月の支出分析)
          </h2>
          <p className="text-[10px] text-muted-foreground truncate">
            Analyze spending trends, top category, and projected spending.
          </p>
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide h-8 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-[0.99] px-3.5"
        >
          <span>Show</span>
          <IconArrowUpRight className="size-3" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[400px] rounded-3xl p-0">
          <div className="flex flex-col max-h-[85vh] p-6">
            <DialogHeader className="gap-1 pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans text-lg text-primary text-center">
                Monthly Insights
              </DialogTitle>
              <div className="text-center font-sans text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">
                今月の支出分析
              </div>
              <DialogDescription className="sr-only">
                Detailed spending insights for the current month.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 py-4 flex flex-col gap-3 min-h-0">
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
                      : `${monthDelta > 0 ? "+" : ""}${formatAmount(monthDelta)}`}
                    <span className="text-xs font-normal text-muted-foreground"> vs last month</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    {monthDelta > 0 
                      ? `You are spending more than last month's ${currency} total (${formatAmount(previousSpentTotal)}).` 
                      : monthDelta < 0 
                        ? `You've spent less than last month's ${currency} total (${formatAmount(previousSpentTotal)}) so far.`
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
                      <span className="text-xs font-normal text-muted-foreground"> ({formatAmount(topCategory[1])})</span>
                    )}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    {topCategory 
                      ? `${Math.round((topCategory[1] / Math.max(actualSpentTotal, 1)) * 100)}% of your ${currency} expenses went to ${topCategory[0].replace(/_/g, " ")}.`
                      : `No ${currency} transactions logged this month yet.`}
                  </p>
                </div>
              </div>

              {/* Daily Spending Rate */}
              <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-lg shrink-0">
                  <IconCalendar className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Daily Spending Rate</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatAmount(dailyAverage)} <span className="text-xs font-normal text-muted-foreground">/ day average</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    At this rate, your projected ${currency} spending for the end of the month is{" "}
                    <span className="font-semibold text-foreground">{formatAmount(projectedSpent)}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 pt-4 border-t border-border/20 justify-end">
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
