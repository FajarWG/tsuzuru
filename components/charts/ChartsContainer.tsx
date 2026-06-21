"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatJPY } from "@/lib/format";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  IconChartBar,
  IconChartDonut,
  IconActivity,
  IconChevronLeft,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";

interface MonthlyOverviewItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CategoryBreakdownItem {
  name: string;
  value: number;
}

interface AccountSpendingItem {
  name: string;
  value: number;
}

interface ChartsContainerProps {
  monthlyOverviewData: MonthlyOverviewItem[];
  categoryBreakdownData: CategoryBreakdownItem[];
  accountSpendingData: AccountSpendingItem[];
}

const COLORS = ["#2D5A3D", "#C9A96E", "#C0392B", "#5C7665", "#D9C39A"];

export default function ChartsContainer({
  monthlyOverviewData,
  categoryBreakdownData,
  accountSpendingData,
}: ChartsContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 flex-1 justify-center items-center h-[60vh] text-xs text-muted-foreground">
        <IconActivity className="size-8 animate-pulse text-primary/40 mb-2" />
        Loading analytics...
      </div>
    );
  }

  // Check if we have data to display
  const hasCategoryData = categoryBreakdownData.some((d) => d.value > 0);
  const hasAccountData = accountSpendingData.some((d) => d.value > 0);

  const currentMonthData =
    monthlyOverviewData.length > 0
      ? monthlyOverviewData[monthlyOverviewData.length - 1]
      : { month: "", income: 0, expense: 0, net: 0 };

  const netSavings = currentMonthData.net;
  const savingsRate =
    currentMonthData.income > 0
      ? Math.round((netSavings / currentMonthData.income) * 100)
      : 0;

  const isGrowth = netSavings >= 0;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors self-start cursor-pointer"
        >
          <IconChevronLeft className="size-3.5" />
          Back to Dashboard
        </Link>
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">
            Spending Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Visual insights into your monthly balances, category breakdowns, and
            pocket money habits.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex items-center gap-3.5">
        <div
          className={cn(
            "p-2.5 rounded-xl shrink-0",
            isGrowth
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
              : "bg-rose-500/10 text-rose-500 dark:text-rose-400",
          )}
        >
          {isGrowth ? (
            <IconArrowUpRight className="size-5 stroke-[2.5]" />
          ) : (
            <IconArrowDownRight className="size-5 stroke-[2.5]" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-gray-600 text-foreground font-medium leading-relaxed">
            {netSavings > 0 ? (
              <>
                This month, you saved{" "}
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatJPY(netSavings)}
                </span>{" "}
                (
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {savingsRate}%
                </span>
                ).
              </>
            ) : netSavings < 0 ? (
              <>
                This month, you overspent by{" "}
                <span className="font-bold text-rose-500 dark:text-rose-400">
                  {formatJPY(Math.abs(netSavings))}
                </span>
                .
              </>
            ) : (
              <>This month, your income matched your expenses exactly.</>
            )}
          </p>
        </div>
      </div>

      {/* 1. Monthly Overview Bar Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconChartBar className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            6-Month Trend (JPY)
          </h2>
        </div>
        <div className="h-64 w-full text-[10px] font-medium font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyOverviewData}>
              <XAxis dataKey="month" stroke="#8A8A8A" />
              <YAxis
                tickFormatter={(val) => `¥${val / 1000}k`}
                stroke="#8A8A8A"
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [formatJPY(Number(val)), ""]}
                contentStyle={{
                  backgroundColor: "#F7F6F3",
                  border: "1px solid #E5E4E0",
                  borderRadius: "12px",
                  fontSize: "11px",
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="income"
                name="Income"
                fill="#2D5A3D"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#C0392B"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Savings"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 2. Category Breakdown Donut */}
        <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/20">
            <IconChartDonut className="size-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Category Share This Month
            </h2>
          </div>
          {!hasCategoryData ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              No category spending recorded this month.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdownData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryBreakdownData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(val: any) => [formatJPY(Number(val)), ""]}
                      contentStyle={{
                        backgroundColor: "#F7F6F3",
                        border: "1px solid #E5E4E0",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 text-xs font-semibold text-muted-foreground">
                {categoryBreakdownData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>
                      {item.name}:{" "}
                      <span className="text-foreground font-bold">
                        {formatJPY(item.value)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Account Spending Donut */}
        <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/20">
            <IconChartDonut className="size-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Spending per Account (JPY)
            </h2>
          </div>
          {!hasAccountData ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              No account spending recorded this month.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountSpendingData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {accountSpendingData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[(index + 2) % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(val: any) => [formatJPY(Number(val)), ""]}
                      contentStyle={{
                        backgroundColor: "#F7F6F3",
                        border: "1px solid #E5E4E0",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 text-xs font-semibold text-muted-foreground">
                {accountSpendingData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="size-3 rounded-full"
                      style={{
                        backgroundColor: COLORS[(index + 2) % COLORS.length],
                      }}
                    />
                    <span>
                      {item.name}:{" "}
                      <span className="text-foreground font-bold">
                        {formatJPY(item.value)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
