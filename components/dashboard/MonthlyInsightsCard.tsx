"use client";

import { useState, useEffect } from "react";
import { formatJPY } from "@/lib/format";
import {
  IconTrendingUp,
  IconWallet,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

interface MonthlyInsightsCardProps {
  monthDelta: number;
  previousSpentTotal: number;
  actualSpentTotal: number;
  topCategory: [string, number] | undefined;
}

export default function MonthlyInsightsCard({
  monthDelta,
  previousSpentTotal,
  actualSpentTotal,
  topCategory,
}: MonthlyInsightsCardProps) {
  const [showInsights, setShowInsights] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize show/hide state from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("tsuzuru_show_insights");
    if (stored !== null) {
      setShowInsights(stored === "true");
    }
  }, []);

  const toggleShowInsights = () => {
    const nextState = !showInsights;
    setShowInsights(nextState);
    localStorage.setItem("tsuzuru_show_insights", String(nextState));
  };

  // Calculate daily spending rate insights
  const today = new Date();
  const currentDay = Math.max(today.getDate(), 1);
  const dailyAverage = actualSpentTotal / currentDay;
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedSpent = dailyAverage * totalDaysInMonth;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Monthly Insights (今月の洞察)
        </h2>
        <button
          onClick={toggleShowInsights}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {showInsights ? (
            <>
              Hide <IconChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Show <IconChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Content - collapsed if showInsights is false */}
      {(!isMounted || showInsights) && (
        <div className="grid grid-cols-1 gap-3">
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

          {/* Daily Spending Rate */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-lg shrink-0">
              <IconCalendar className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Daily Spending Rate</span>
              <span className="text-sm font-bold text-foreground">
                {formatJPY(dailyAverage)} <span className="text-xs font-normal text-muted-foreground">/ day average</span>
              </span>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                At this rate, your projected JPY spending for the end of the month is{" "}
                <span className="font-semibold text-foreground">{formatJPY(projectedSpent)}</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
