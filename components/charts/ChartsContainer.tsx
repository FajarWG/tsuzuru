"use client";

import { useEffect, useState } from "react";
import { formatJPY } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  IconChartBar,
  IconChartDonut,
  IconActivity,
  IconPizza
} from "@tabler/icons-react";

interface MonthlyOverviewItem {
  month: string;
  income: number;
  expense: number;
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
  avgMealsPerDay: number;
  totalFoodMeals: number;
}

const COLORS = ["#2D5A3D", "#C9A96E", "#C0392B", "#5C7665", "#D9C39A"];

export default function ChartsContainer({
  monthlyOverviewData,
  categoryBreakdownData,
  accountSpendingData,
  avgMealsPerDay,
  totalFoodMeals,
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

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">
          Spending Analytics
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Visual insights into your monthly balances, category breakdowns, and pocket money habits.
        </p>
      </div>

      {/* 1. Monthly Overview Bar Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconChartBar className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">6-Month Trend (JPY)</h2>
        </div>
        <div className="h-64 w-full text-[10px] font-medium font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyOverviewData}>
              <XAxis dataKey="month" stroke="#8A8A8A" />
              <YAxis tickFormatter={(val) => `¥${val / 1000}k`} stroke="#8A8A8A" />
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
              <Bar dataKey="income" name="Income" fill="#2D5A3D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#C0392B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 2. Category Breakdown Donut */}
        <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/20">
            <IconChartDonut className="size-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Category Share This Month</h2>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                      {item.name}: <span className="text-foreground font-bold">{formatJPY(item.value)}</span>
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
            <h2 className="text-sm font-bold text-foreground">Spending per Account (JPY)</h2>
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
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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
                      style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}
                    />
                    <span>
                      {item.name}: <span className="text-foreground font-bold">{formatJPY(item.value)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Pocket Money: Jajan Detail/Meal Stats */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconPizza className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Pocket Money: Food Details</h2>
        </div>
        <div className="flex items-center justify-around py-2">
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
              Average Meals / Day
            </span>
            <p className="text-3xl font-sans font-black text-primary mt-1.5">
              {avgMealsPerDay.toFixed(1)}
            </p>
          </div>
          <div className="w-px h-12 bg-border/40" />
          <div className="text-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
              Total Food Meals
            </span>
            <p className="text-3xl font-sans font-black text-secondary mt-1.5">
              {totalFoodMeals}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-2 border-t border-border/20 pt-3">
          Your daily food counts are tracked from pocket money expenses in the food category (1st/2nd/3rd/4th meal tags).
        </p>
      </div>
    </div>
  );
}
