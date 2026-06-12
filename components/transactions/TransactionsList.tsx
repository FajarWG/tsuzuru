"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { formatJPY, formatIDR, formatInputAmount, parseInputAmount } from "@/lib/format";
import {
  IconAdjustments,
  IconBus,
  IconCalendar,
  IconCreditCard,
  IconDeviceGamepad,
  IconDeviceLaptop,
  IconEdit,
  IconFilter,
  IconGlass,
  IconHeart,
  IconHelp,
  IconHome,
  IconLoader,
  IconPizza,
  IconRefresh,
  IconSearch,
  IconShirt,
  IconTools,
  IconTrash,
  IconTrendingUp,
  IconWallet,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TransactionType = "expense" | "income";
type TransactionCategory =
  | "pocket_money"
  | "shopping"
  | "income"
  | "template"
  | "adjustment";

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  category: string;
  subCategory: string | null;
  mealNumber: number | null;
  description: string | null;
  date: Date | string;
  isTemplate: boolean;
  account: {
    id: string;
    name: string;
    currency: string;
  };
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface TransactionsListProps {
  userId: string;
  transactions: TransactionItem[];
  accounts: AccountItem[];
}

const POCKET_MONEY_SUBCATS = [
  { value: "food", label: "Food" },
  { value: "drinks", label: "Drinks" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "others", label: "Others" },
];

const SHOPPING_SUBCATS = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "household", label: "Household" },
  { value: "health", label: "Healthcare" },
  { value: "others", label: "Others" },
];

function getCategoryIcon(category: string, subCategory: string | null) {
  if (category === "income")
    return <IconTrendingUp className="size-5 text-primary" />;
  if (category === "template")
    return <IconTools className="size-5 text-amber-500" />;
  if (category === "adjustment")
    return <IconAdjustments className="size-5 text-blue-500" />;

  if (category === "pocket_money") {
    switch (subCategory) {
      case "food":
        return <IconPizza className="size-5 text-amber-600" />;
      case "drinks":
        return <IconGlass className="size-5 text-blue-500" />;
      case "transport":
        return <IconBus className="size-5 text-slate-500" />;
      case "entertainment":
        return <IconDeviceGamepad className="size-5 text-purple-500" />;
      default:
        return <IconWallet className="size-5 text-stone-500" />;
    }
  }

  if (category === "shopping") {
    switch (subCategory) {
      case "electronics":
        return <IconDeviceLaptop className="size-5 text-cyan-600" />;
      case "clothing":
        return <IconShirt className="size-5 text-pink-500" />;
      case "household":
        return <IconHome className="size-5 text-orange-500" />;
      case "health":
        return <IconHeart className="size-5 text-rose-500" />;
      default:
        return <IconCreditCard className="size-5 text-stone-500" />;
    }
  }

  return <IconHelp className="size-5 text-stone-400" />;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string) {
  return currency === "JPY" ? formatJPY(amount) : formatIDR(amount);
}

export default function TransactionsList({
  userId,
  transactions,
  accounts,
}: TransactionsListProps) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    [today],
  );

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(currentMonthKey);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [editing, setEditing] = useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = useState<TransactionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editType, setEditType] = useState<TransactionType>("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState(accounts[0]?.id || "");
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>("pocket_money");
  const [editSubCategory, setEditSubCategory] = useState("food");
  const [editMealNumber, setEditMealNumber] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState(() => new Date());

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        value,
      };
    });
  }, [today]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const txMonthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;

      if (monthFilter !== "all" && txMonthKey !== monthFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (accountFilter !== "all" && tx.account.id !== accountFilter)
        return false;
      if (categoryFilter !== "all" && tx.category !== categoryFilter)
        return false;

      if (startDateFilter && txDate < new Date(`${startDateFilter}T00:00:00`))
        return false;
      if (endDateFilter && txDate > new Date(`${endDateFilter}T23:59:59`))
        return false;

      if (search) {
        const needle = search.toLowerCase();
        const haystack = [
          tx.description,
          tx.category,
          tx.subCategory,
          tx.account.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  }, [
    transactions,
    monthFilter,
    typeFilter,
    accountFilter,
    categoryFilter,
    startDateFilter,
    endDateFilter,
    search,
  ]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce<Record<string, TransactionItem[]>>(
      (groups, tx) => {
        const label = new Date(tx.date).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        groups[label] = groups[label] || [];
        groups[label].push(tx);
        return groups;
      },
      {},
    );
  }, [filteredTransactions]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (totals, tx) => {
        const bucket = tx.currency === "JPY" ? "JPY" : "IDR";
        if (tx.type === "income") totals.income[bucket] += tx.amount;
        if (tx.type === "expense") totals.expense[bucket] += tx.amount;
        return totals;
      },
      {
        income: { JPY: 0, IDR: 0 },
        expense: { JPY: 0, IDR: 0 },
      },
    );
  }, [filteredTransactions]);

  const resetFilters = () => {
    setSearch("");
    setAccountFilter("all");
    setCategoryFilter("all");
    setTypeFilter("all");
    setMonthFilter(currentMonthKey);
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const openEdit = (tx: TransactionItem) => {
    const nextType = tx.type === "income" ? "income" : "expense";
    const nextCategory =
      nextType === "income" ? "income" : (tx.category as TransactionCategory);

    setEditing(tx);
    setEditType(nextType);
    setEditAmount(formatInputAmount(tx.amount));
    setEditAccountId(tx.account.id);
    setEditCategory(nextCategory);
    setEditSubCategory(tx.subCategory || "");
    setEditMealNumber(tx.mealNumber);
    setEditDescription(tx.description || "");
    setEditDate(new Date(tx.date));
    setError(null);
  };

  const handleEditTypeChange = (nextType: TransactionType) => {
    setEditType(nextType);
    if (nextType === "income") {
      setEditCategory("income");
      setEditSubCategory("");
      setEditMealNumber(null);
    } else {
      setEditCategory("pocket_money");
      setEditSubCategory("");
      setEditMealNumber(null);
    }
  };

  const handleEditCategoryChange = (nextCategory: TransactionCategory) => {
    setEditCategory(nextCategory);
    setEditSubCategory("");
    setEditMealNumber(null);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    const parsedAmount = parseInputAmount(editAmount);
    if (!editAmount || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (
      editType === "expense" &&
      ["pocket_money", "shopping"].includes(editCategory) &&
      !editSubCategory
    ) {
      setError("Please select a sub-category");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await updateTransactionAction({
        id: editing.id,
        userId,
        accountId: editAccountId,
        type: editType,
        amount: parsedAmount,
        category: editType === "income" ? "income" : editCategory,
        subCategory:
          editType === "income" ||
          !["pocket_money", "shopping"].includes(editCategory)
            ? null
            : editSubCategory,
        mealNumber:
          editType === "expense" && editSubCategory === "food"
            ? editMealNumber
            : null,
        description: editDescription.trim() || null,
        date: editDate,
      });

      if (res.success) {
        toast.success("Transaction updated successfully");
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error || "Failed to update transaction");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await deleteTransactionAction(deleting.id, userId);

      if (res.success) {
        toast.success("Transaction deleted successfully");
        setDeleting(null);
        router.refresh();
      } else {
        setError(res.error || "Failed to delete transaction");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const editSubcatOptions =
    editCategory === "shopping" ? SHOPPING_SUBCATS : POCKET_MONEY_SUBCATS;

  return (
    <div className="flex flex-col gap-5 flex-1">
      {/* Header & Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.05 }}
        className="flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
            Transactions
          </h1>
        </div>

        {/* Search Input & Reset Button */}
        <div className="flex gap-2">
          <div className="flex-1 relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-4 h-12 shadow-2xs">
            <IconSearch className="size-4 text-muted-foreground mr-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search descriptions, categories, accounts..."
              className="flex-1 h-full bg-transparent text-base md:text-xs font-medium focus:outline-none text-foreground"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            className="h-12 px-4 rounded-2xl shrink-0 bg-white dark:bg-zinc-900 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <IconFilter className="size-4" />
            Filter
          </Button>
        </div>
      </motion.div>

      {/* Segmented Controls & Dropdown Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        {/* Type Filter Segmented Control */}
        <div className="flex rounded-lg bg-muted p-1 border border-border/10">
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-semibold capitalize transition-all cursor-pointer",
                typeFilter === t
                  ? "bg-white text-foreground shadow-xs dark:bg-zinc-800"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>

        {/* Dropdown Filters (Month, Account, Category) */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden flex flex-col gap-3"
            >
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col gap-1 min-w-0">
                  <Label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
                    Month
                  </Label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-10 rounded-xl text-[10px] font-semibold px-2 w-full overflow-hidden">
                      <SelectValue className="truncate block max-w-full text-left" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Months
                      </SelectItem>
                      {monthOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <Label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
                    Account
                  </Label>
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger className="h-10 rounded-xl text-[10px] font-semibold px-2 w-full overflow-hidden">
                      <SelectValue className="truncate block max-w-full text-left" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Accounts
                      </SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <Label className="text-[10px] font-semibold text-muted-foreground tracking-wide pl-1">
                    Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-10 rounded-xl text-[10px] font-semibold px-2 w-full overflow-hidden">
                      <SelectValue className="truncate block max-w-full text-left" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Categories
                      </SelectItem>
                      <SelectItem value="pocket_money" className="text-xs">
                        Pocket Money
                      </SelectItem>
                      <SelectItem value="shopping" className="text-xs">
                        Shopping
                      </SelectItem>
                      <SelectItem value="income" className="text-xs">
                        Income
                      </SelectItem>
                      <SelectItem value="template" className="text-xs">
                        Templates
                      </SelectItem>
                      <SelectItem value="adjustment" className="text-xs">
                        Adjustments
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reset Filters Option */}
              <div className="flex justify-end px-1 pb-1">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <IconRefresh className="size-3" />
                  Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.15 }}
        className="grid grid-cols-2 gap-2"
      >
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Expense
          </p>
          <p className="text-sm font-sans font-bold text-destructive mt-1">
            {formatJPY(summary.expense.JPY)}
          </p>
          {summary.expense.IDR > 0 && (
            <p className="text-xs font-sans font-bold text-destructive mt-0.5">
              {formatIDR(summary.expense.IDR)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Income
          </p>
          <p className="text-sm font-sans font-bold text-primary mt-1">
            {formatJPY(summary.income.JPY)}
          </p>
          {summary.income.IDR > 0 && (
            <p className="text-xs font-sans font-bold text-primary mt-0.5">
              {formatIDR(summary.income.IDR)}
            </p>
          )}
        </div>
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
        className="flex flex-col gap-5 mt-2"
      >
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              No transactions found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust the filters or add a new transaction from the plus button.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateLabel, items]) => (
            <div key={dateLabel} className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                {dateLabel}
              </h3>

              <div className="flex flex-col gap-2">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex justify-between items-center gap-3 shadow-xs"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="p-2 bg-muted rounded-xl text-primary">
                        {getCategoryIcon(tx.category, tx.subCategory)}
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs font-semibold text-foreground leading-tight">
                          {tx.description || tx.category.replace(/_/g, " ")}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground leading-none">
                          {tx.account.name} · {tx.subCategory || tx.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right flex flex-col items-end">
                        <span
                          className={`text-xs font-sans font-bold ${
                            tx.type === "expense"
                              ? "text-destructive"
                              : "text-primary"
                          }`}
                        >
                          {tx.type === "expense" ? "-" : "+"}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(tx)}
                        aria-label="Edit transaction"
                      >
                        <IconEdit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setDeleting(tx);
                          setError(null);
                        }}
                        aria-label="Delete transaction"
                      >
                        <IconTrash className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </motion.div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!isSaving && !open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-serif text-xl">
                Edit Transaction
              </DialogTitle>
              <DialogDescription className="text-xs">
                Balance will be adjusted automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 py-3 min-h-0">
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex bg-muted p-1 rounded-lg border border-border/20">
                {(["expense", "income"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleEditTypeChange(type)}
                    className={cn(
                      "flex-1 h-9 rounded-md text-xs font-semibold tracking-wide transition-all capitalize cursor-pointer",
                      editType === type
                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Amount
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={editAmount}
                  onChange={(e) => setEditAmount(formatInputAmount(e.target.value))}
                  className="h-11 rounded-xl font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Account
                </Label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-sm">
                        {acc.name}{" "}
                        <span className="text-muted-foreground">
                          ({acc.currency})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editType === "expense" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Category
                    </Label>
                    <Select
                      value={editCategory}
                      onValueChange={(value) =>
                        handleEditCategoryChange(value as TransactionCategory)
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pocket_money" className="text-sm">
                          Pocket Money
                        </SelectItem>
                        <SelectItem value="shopping" className="text-sm">
                          Shopping
                        </SelectItem>
                        <SelectItem value="template" className="text-sm">
                          Template
                        </SelectItem>
                        <SelectItem value="adjustment" className="text-sm">
                          Adjustment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {["pocket_money", "shopping"].includes(editCategory) && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Sub-category
                      </Label>
                      <Select
                        value={editSubCategory}
                        onValueChange={(value) => {
                          setEditSubCategory(value);
                          setEditMealNumber(value === "food" ? 1 : null);
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                        <SelectContent>
                          {editSubcatOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-sm"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editCategory === "pocket_money" &&
                    editSubCategory === "food" && (
                      <div className="flex flex-col gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                        <Label className="text-[10px] font-bold tracking-wide text-primary uppercase">
                          Which meal?
                        </Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map((meal) => (
                            <button
                              key={meal}
                              type="button"
                              onClick={() => setEditMealNumber(meal)}
                              className={cn(
                                "flex-1 h-8 rounded-lg border text-xs font-semibold transition-all",
                                editMealNumber === meal
                                  ? "bg-primary text-primary-foreground border-transparent"
                                  : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted",
                              )}
                            >
                              {meal}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Description
                </Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Optional"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 justify-start rounded-xl bg-white px-3 text-sm font-semibold dark:bg-zinc-900"
                    >
                      <IconCalendar className="size-4 text-muted-foreground" />
                      {formatDisplayDate(editDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={(selectedDate) => {
                        if (selectedDate) setEditDate(selectedDate);
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="min-w-[88px]"
              >
                {isSaving ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!isDeleting && !open) setDeleting(null);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete Transaction</DialogTitle>
            <DialogDescription className="text-xs">
              This will remove the transaction and reverse its balance effect.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {deleting && (
            <div className="rounded-2xl border border-border/40 bg-muted/40 p-3">
              <p className="text-sm font-semibold">
                {deleting.description || deleting.category.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {deleting.account.name} ·{" "}
                {formatDateKey(new Date(deleting.date))} ·{" "}
                {formatCurrency(deleting.amount, deleting.currency)}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="min-w-[88px]"
            >
              {isDeleting ? (
                <IconLoader className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
