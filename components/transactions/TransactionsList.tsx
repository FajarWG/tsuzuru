"use client";

import { useState } from "react";
import { formatJPY, formatIDR } from "@/lib/format";
import {
  IconSearch,
  IconDownload,
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
  IconBuildingBank,
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
  IconActivity
} from "@tabler/icons-react";

interface TransactionItem {
  id: string;
  type: string; // "expense" | "income"
  amount: number;
  currency: string;
  category: string;
  subCategory: string | null;
  mealNumber: number | null;
  description: string | null;
  date: Date | string;
  account: {
    id: string;
    name: string;
  };
}

interface AccountItem {
  id: string;
  name: string;
}

interface TransactionsListProps {
  transactions: TransactionItem[];
  accounts: AccountItem[];
}

function getCategoryIcon(category: string, subCategory: string | null) {
  if (category === "income") return <IconTrendingUp className="size-5 text-brand-green" />;
  if (category === "template") return <IconTools className="size-5 text-secondary" />;
  
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

export default function TransactionsList({
  transactions,
  accounts,
}: TransactionsListProps) {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Determine available months in the transactions list for the filter
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [monthFilter, setMonthFilter] = useState(currentMonthKey);

  // Parse transaction dates and filter
  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;

    // Month filter check
    if (monthFilter !== "all" && txMonthKey !== monthFilter) {
      return false;
    }

    // Search query check
    if (
      search &&
      !tx.description?.toLowerCase().includes(search.toLowerCase()) &&
      !tx.category.toLowerCase().includes(search.toLowerCase()) &&
      !(tx.subCategory || "").toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    // Account check
    if (accountFilter !== "all" && tx.account.id !== accountFilter) {
      return false;
    }

    // Category check
    if (categoryFilter !== "all" && tx.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  // Group filtered transactions by date
  const groupedTransactions: Record<string, TransactionItem[]> = {};
  filteredTransactions.forEach((tx) => {
    const formattedDate = new Date(tx.date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedTransactions[formattedDate]) {
      groupedTransactions[formattedDate] = [];
    }
    groupedTransactions[formattedDate].push(tx);
  });

  // Generate a list of the last 12 months for the month selector dropdown
  const monthOptions: { label: string; value: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    monthOptions.push({ label, value: val });
  }

  return (
    <div className="flex flex-col gap-5 flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
          Transactions
        </h1>
        {/* Export Button (Disabled Placeholder) */}
        <button
          disabled
          className="h-9 px-3 rounded-xl border border-border bg-white text-muted-foreground font-sans text-xs font-semibold flex items-center gap-1.5 opacity-50 cursor-not-allowed select-none"
        >
          <IconDownload className="size-4" />
          Export
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-4 h-12 shadow-2xs">
        <IconSearch className="size-4 text-muted-foreground mr-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search descriptions..."
          className="flex-1 h-full bg-transparent text-xs font-medium focus:outline-none text-foreground"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Month Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
            Month
          </label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-10 px-2.5 border border-border/50 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Months</option>
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Account Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
            Account
          </label>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="h-10 px-2.5 border border-border/50 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-2.5 border border-border/50 rounded-xl bg-white dark:bg-zinc-900 text-[10px] font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="pocket_money">Pocket Money</option>
            <option value="shopping">Shopping</option>
            <option value="income">Income</option>
            <option value="template">Templates</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-5 mt-2">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-8 text-center text-xs text-muted-foreground">
            No transactions found for the selected filters.
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateLabel, items]) => (
            <div key={dateLabel} className="flex flex-col gap-2">
              {/* Date Header */}
              <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                {dateLabel}
              </h3>
              
              {/* Transactions on this Date */}
              <div className="flex flex-col gap-2">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex justify-between items-center gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-xl text-primary">
                        {getCategoryIcon(tx.category, tx.subCategory)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground leading-tight">
                          {tx.description || tx.category.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none">
                          {tx.account.name} • {tx.subCategory || tx.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span
                        className={`text-xs font-sans font-bold ${
                          tx.type === "expense" ? "text-destructive" : "text-brand-green"
                        }`}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {tx.currency === "JPY" ? formatJPY(tx.amount) : formatIDR(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
