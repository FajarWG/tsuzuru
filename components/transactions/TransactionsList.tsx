"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { formatJPY, formatIDR, formatInputAmount, parseInputAmount } from "@/lib/format";
import {
  IconAdjustments,
  IconBus,
  IconCalendar,
  IconCheck,
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
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShirt,
  IconTools,
  IconTrash,
  IconTrendingUp,
  IconWallet,
  IconChevronDown,
  IconReceipt,
  IconBriefcase,
  IconGift,
  IconCoins,
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
  getPaginatedTransactionsAction,
} from "@/lib/actions/transactions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TransactionType = "expense" | "income";
type TransactionCategory =
  | "pocket_money"
  | "shopping"
  | "income"
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
  isReceipt?: boolean;
  receiptItems?: any;
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
  syncStatus?: "idle" | "syncing" | "success" | "error";
  onSync?: () => void;
}

const POCKET_MONEY_SUBCATS = [
  { value: "shopping", label: "Shopping" },
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

const INCOME_SUBCATS = [
  { value: "salary", label: "Salary" },
  { value: "bonus", label: "Bonus" },
  { value: "allowance", label: "Allowance" },
  { value: "others", label: "Others" },
];

function getCategoryIcon(category: string, subCategory: string | null) {
  if (category === "income") {
    switch (subCategory) {
      case "salary":
        return <IconBriefcase className="size-5 text-emerald-500" />;
      case "bonus":
        return <IconGift className="size-5 text-orange-500" />;
      case "allowance":
        return <IconCoins className="size-5 text-teal-500" />;
      default:
        return <IconTrendingUp className="size-5 text-emerald-500" />;
    }
  }
  if (category === "adjustment")
    return <IconAdjustments className="size-5 text-blue-500" />;

  if (category === "pocket_money") {
    switch (subCategory) {
      case "shopping":
        return <IconCreditCard className="size-5 text-stone-500" />;
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

const cleanDescription = (desc: string | null) => {
  if (!desc) return "";
  return desc.replace(/\[tx_id:[^\]]+\]/g, "").trim();
}

export default function TransactionsList({
  userId,
  transactions,
  accounts,
  syncStatus = "idle",
  onSync,
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

  const [loadedTransactions, setLoadedTransactions] = useState<TransactionItem[]>(() => transactions);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [serverSummary, setServerSummary] = useState<{
    income: { JPY: number; IDR: number };
    expense: { JPY: number; IDR: number };
  } | null>(null);

  // Sync loadedTransactions when transactions prop updates under default filters
  useEffect(() => {
    const isDefaultFilters =
      typeFilter === "all" &&
      accountFilter === "all" &&
      categoryFilter === "all" &&
      monthFilter === currentMonthKey &&
      !startDateFilter &&
      !endDateFilter &&
      !search &&
      page === 1;

    if (isDefaultFilters) {
      setLoadedTransactions(transactions);
    }
  }, [transactions, typeFilter, accountFilter, categoryFilter, monthFilter, startDateFilter, endDateFilter, search, page, currentMonthKey]);

  const loadData = useCallback(async (pageToLoad: number, append = false) => {
    if (typeof window !== "undefined" && !navigator.onLine) return;

    if (pageToLoad === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await getPaginatedTransactionsAction({
        page: pageToLoad,
        limit: 20,
        typeFilter,
        accountId: accountFilter,
        categoryFilter,
        monthFilter,
        startDateFilter,
        endDateFilter,
        search,
      });

      if (res.success && res.transactions) {
        const newTxs = res.transactions as unknown as TransactionItem[];
        setLoadedTransactions((prev) => (append ? [...prev, ...newTxs] : newTxs));
        setHasMore(res.hasMore ?? false);
        if (res.summary) {
          setServerSummary(res.summary);
        }
        setHasLoadedOnce(true);
      } else {
        toast.error(res.error || "Failed to load transactions");
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [
    typeFilter,
    accountFilter,
    categoryFilter,
    monthFilter,
    startDateFilter,
    endDateFilter,
    search,
  ]);

  // Trigger loadData when online and filters change
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.onLine) {
      setPage(1);
      loadData(1, false);
    }
  }, [
    typeFilter,
    accountFilter,
    categoryFilter,
    monthFilter,
    startDateFilter,
    endDateFilter,
    search,
    loadData,
  ]);

  // Listen for transaction-added event to refresh list
  useEffect(() => {
    const handleTransactionAdded = () => {
      if (typeof window !== "undefined" && navigator.onLine) {
        setPage(1);
        loadData(1, false);
      } else {
        setPage(1);
      }
    };
    window.addEventListener("transaction-added", handleTransactionAdded);
    return () => {
      window.removeEventListener("transaction-added", handleTransactionAdded);
    };
  }, [loadData]);



  const [editing, setEditing] = useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = useState<TransactionItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});

  const [editType, setEditType] = useState<TransactionType>("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState(accounts[0]?.id || "");
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>("pocket_money");
  const [editSubCategory, setEditSubCategory] = useState("food");
  const [editMealNumber, setEditMealNumber] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState(() => new Date());

  const [editIsReceipt, setEditIsReceipt] = useState(false);
  const [editReceiptItems, setEditReceiptItems] = useState<{ name: string; price: number }[]>([]);
  const [editNewItemName, setEditNewItemName] = useState("");
  const [editNewItemPrice, setEditNewItemPrice] = useState("");

  const totalReceiptAmount = editReceiptItems.reduce((sum, item) => sum + item.price, 0);

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

  const adjustedTransactions = useMemo(() => {
    const settlementsMap: Record<string, { total: number; items: any[] }> = {};
    
    transactions.forEach((tx) => {
      if (tx.category === "adjustment" && tx.description && tx.description.includes("[tx_id:")) {
        const match = tx.description.match(/\[tx_id:([^\]]+)\]/);
        if (match && match[1]) {
          const splitGroupId = match[1];
          if (!settlementsMap[splitGroupId]) {
            settlementsMap[splitGroupId] = { total: 0, items: [] };
          }
          settlementsMap[splitGroupId].total += tx.amount;
          settlementsMap[splitGroupId].items.push(tx);
        }
      }
    });

    return transactions
      .filter((tx) => {
        if (tx.category === "adjustment" && tx.description && tx.description.includes("[tx_id:")) {
          return false;
        }
        return true;
      })
      .map((tx) => {
        const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
        const splitGroupId = match ? match[1] : null;
        
        if (splitGroupId) {
          const settlements = settlementsMap[splitGroupId];
          if (settlements && settlements.total > 0) {
            const adjustedAmount = Math.max(0, tx.amount - settlements.total);
            return {
              ...tx,
              amount: adjustedAmount,
              originalAmount: tx.amount,
              settledAmount: settlements.total,
              settlementsList: settlements.items,
            };
          }
        }
        
        return {
          ...tx,
          originalAmount: tx.amount,
          settledAmount: 0,
          settlementsList: [],
        };
      });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return adjustedTransactions.filter((tx) => {
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
          cleanDescription(tx.description),
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
    adjustedTransactions,
    monthFilter,
    typeFilter,
    accountFilter,
    categoryFilter,
    startDateFilter,
    endDateFilter,
    search,
  ]);



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

  const displayTransactions = useMemo(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return filteredTransactions.slice(0, page * 20);
    }
    // Fallback to cached transactions if they exist and we haven't successfully completed a fetch yet
    if (!hasLoadedOnce && loadedTransactions.length === 0) {
      return filteredTransactions.slice(0, page * 20);
    }
    return loadedTransactions;
  }, [loadedTransactions, filteredTransactions, page, hasLoadedOnce]);

  const displaySummary = useMemo(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return summary;
    }
    return serverSummary || summary;
  }, [serverSummary, summary]);

  const displayHasMore = useMemo(() => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      return page * 20 < filteredTransactions.length;
    }
    return hasMore;
  }, [hasMore, filteredTransactions.length, page]);

  const groupedTransactions = useMemo(() => {
    return displayTransactions.reduce<Record<string, TransactionItem[]>>(
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
  }, [displayTransactions]);



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
    setEditAmount(formatInputAmount((tx as any).originalAmount ?? tx.amount));
    setEditAccountId(tx.account.id);
    setEditCategory(nextCategory);
    setEditSubCategory(tx.subCategory || "");
    setEditMealNumber(tx.mealNumber);
    setEditDescription(cleanDescription(tx.description));
    setEditDate(new Date(tx.date));
    setEditIsReceipt(tx.isReceipt || false);
    try {
      const items = tx.receiptItems ? (typeof tx.receiptItems === "string" ? JSON.parse(tx.receiptItems) : tx.receiptItems) : [];
      setEditReceiptItems(Array.isArray(items) ? items : []);
    } catch {
      setEditReceiptItems([]);
    }
    setEditNewItemName("");
    setEditNewItemPrice("");
  };

  const handleEditModeChange = (receiptMode: boolean) => {
    setEditIsReceipt(receiptMode);
    if (receiptMode) {
      setEditType("expense");
      setEditCategory("pocket_money");
      setEditSubCategory("shopping");
    } else {
      setEditType("expense");
      setEditCategory("pocket_money");
      setEditSubCategory("others");
      setEditMealNumber(null);
    }
  };

  const handleEditTypeChange = (nextType: TransactionType) => {
    setEditType(nextType);
    if (nextType === "income") {
      setEditCategory("income");
      setEditSubCategory("salary");
      setEditMealNumber(null);
    } else {
      setEditCategory("pocket_money");
      setEditSubCategory("others");
      setEditMealNumber(null);
    }
  };

  const handleEditCategoryChange = (nextCategory: TransactionCategory) => {
    setEditCategory(nextCategory);
    setEditSubCategory(["pocket_money", "shopping"].includes(nextCategory) ? "others" : "");
    setEditMealNumber(null);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    const parsedAmount = editIsReceipt ? totalReceiptAmount : parseInputAmount(editAmount);
    if (editIsReceipt && editReceiptItems.length === 0) {
      toast.error("Please add at least one item to the receipt");
      return;
    }
    if (!editIsReceipt && (!editAmount || parsedAmount <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Transaction amount must be greater than 0");
      return;
    }
    if (
      editType === "expense" &&
      ["pocket_money", "shopping"].includes(editCategory) &&
      !editSubCategory
    ) {
      toast.error("Please select a sub-category");
      return;
    }

    setIsSaving(true);

    try {
      const match = editing.description ? editing.description.match(/\[tx_id:[^\]]+\]/) : null;
      const tag = match ? ` ${match[0]}` : "";
      const finalDesc = editDescription.trim() ? `${editDescription.trim()}${tag}` : (tag ? tag.trim() : null);

      const res = await updateTransactionAction({
        id: editing.id,
        userId,
        accountId: editAccountId,
        type: editType,
        amount: parsedAmount,
        category: editType === "income" ? "income" : editCategory,
        subCategory:
          editType === "income"
            ? editSubCategory
            : !["pocket_money", "shopping"].includes(editCategory)
            ? null
            : editSubCategory,
        mealNumber:
          editType === "expense" && editSubCategory === "food"
            ? editMealNumber
            : null,
        description: finalDesc,
        date: editDate,
        isReceipt: editIsReceipt,
        receiptItems: editIsReceipt ? editReceiptItems : null,
      });

      if (res.success) {
        toast.success("Transaction updated successfully");
        setEditing(null);
        window.dispatchEvent(new CustomEvent("transaction-added"));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update transaction");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setIsDeleting(true);

    try {
      const res = await deleteTransactionAction(deleting.id);

      if (res.success) {
        toast.success("Transaction deleted successfully");
        setDeleting(null);
        window.dispatchEvent(new CustomEvent("transaction-added"));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const editSubcatOptions =
    editCategory === "income"
      ? INCOME_SUBCATS
      : editCategory === "shopping"
      ? SHOPPING_SUBCATS
      : POCKET_MONEY_SUBCATS;

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
          <div className="flex items-center gap-3">
            <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">
              Transactions
            </h1>
            
            {syncStatus !== "idle" && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center p-1.5 rounded-full hover:bg-muted/40 transition-colors cursor-pointer focus:outline-none"
                    aria-label="Sync status"
                  >
                    {syncStatus === "syncing" && (
                      <IconLoader className="size-4 animate-spin text-muted-foreground" />
                    )}
                    {syncStatus === "success" && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-green-600 bg-green-500/10 p-0.5 rounded-full"
                      >
                        <IconCheck className="size-3.5 stroke-[3]" />
                      </motion.div>
                    )}
                    {syncStatus === "error" && (
                      <span className="flex items-center justify-center size-4 bg-destructive/10 text-destructive font-bold text-xs rounded-full">
                        !
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3 rounded-xl border border-border bg-popover text-popover-foreground shadow-md" side="right" align="center">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold">
                      {syncStatus === "syncing" && "Updating data..."}
                      {syncStatus === "success" && "Data is up to date"}
                      {syncStatus === "error" && "Sync failed"}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {syncStatus === "syncing" && "Synchronizing transaction records with server."}
                      {syncStatus === "success" && "Successfully updated transaction records!"}
                      {syncStatus === "error" && "Could not sync data. Check your internet connection."}
                    </p>
                    {onSync && syncStatus !== "syncing" && (
                      <button
                        type="button"
                        onClick={onSync}
                        className="mt-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-primary hover:underline self-start cursor-pointer"
                      >
                        <IconRefresh className="size-3" />
                        Sync now
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Search Input & Reset Button */}
        <div className="flex gap-2 w-full min-w-0">
          <div className="flex-1 min-w-0 relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-4 h-12 shadow-2xs">
            <IconSearch className="size-4 text-muted-foreground shrink-0 mr-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full min-w-0 h-full bg-transparent text-base md:text-xs font-medium focus:outline-none text-foreground"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            className="h-12 w-12 rounded-2xl shrink-0 bg-white dark:bg-zinc-900 cursor-pointer flex items-center justify-center"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <IconFilter className="size-4" />
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
            {formatJPY(displaySummary.expense.JPY)}
          </p>
          {displaySummary.expense.IDR > 0 && (
            <p className="text-xs font-sans font-bold text-destructive mt-0.5">
              {formatIDR(displaySummary.expense.IDR)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Income
          </p>
          <p className="text-sm font-sans font-bold text-primary mt-1">
            {formatJPY(displaySummary.income.JPY)}
          </p>
          {displaySummary.income.IDR > 0 && (
            <p className="text-xs font-sans font-bold text-primary mt-0.5">
              {formatIDR(displaySummary.income.IDR)}
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
          <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-8 text-center animate-pulse">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <IconLoader className="size-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Fetching transactions...</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  No transactions found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adjust the filters or add a new transaction from the plus button.
                </p>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {Object.entries(groupedTransactions).map(([dateLabel, items]) => (
              <motion.div
                key={dateLabel}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-2"
              >
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-1">
                  {dateLabel}
                </h3>

                <div className="flex flex-col gap-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((tx) => {
                      const isExpanded = !!expandedReceipts[tx.id];
                      return (
                        <motion.div
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, scale: 0.96, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -8 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          onClick={() => tx.isReceipt && setExpandedReceipts((prev) => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                          className={cn(
                            "border rounded-2xl p-4 flex flex-col gap-3 shadow-xs transition-all select-none bg-white dark:bg-zinc-900 relative overflow-hidden",
                            tx.isReceipt 
                              ? "border-emerald-500/30 dark:border-emerald-500/20 cursor-pointer hover:bg-zinc-50/40 dark:hover:bg-zinc-950/20" 
                              : "border-border/40"
                          )}
                        >
                          {tx.isReceipt && (
                            <IconReceipt className="absolute -right-4 top-1/2 -translate-y-1/2 size-24 text-emerald-500/[0.05] dark:text-emerald-500/[0.03] pointer-events-none" />
                          )}
                          <div className="flex justify-between items-center w-full gap-3 z-10">
                            <div className="flex min-w-0 items-center gap-3 flex-1">
                              <div className="p-2 bg-muted rounded-xl text-primary shrink-0">
                                {getCategoryIcon(tx.category, tx.subCategory)}
                              </div>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-xs font-semibold text-foreground leading-tight">
                                  {cleanDescription(tx.description) || 
                                    (tx.category === "income" && tx.subCategory 
                                      ? tx.subCategory.charAt(0).toUpperCase() + tx.subCategory.slice(1) 
                                      : tx.category === "income" ? "Income" : tx.category.replace(/_/g, " ")
                                    )
                                  }
                                </span>
                                <span className="truncate text-[10px] text-muted-foreground leading-none">
                                  {tx.account.name} · {tx.subCategory || tx.category}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <div className="text-right flex flex-col items-end mr-1">
                                <span
                                  className={`text-xs font-sans font-bold ${
                                    tx.type === "expense"
                                      ? tx.amount < 0
                                        ? "text-primary"
                                        : "text-destructive"
                                      : "text-primary"
                                  }`}
                                >
                                  {tx.type === "expense" ? (tx.amount < 0 ? "+" : "-") : "+"}
                                  {formatCurrency(Math.abs(tx.amount), tx.currency)}
                                </span>
                                {(tx as any).settledAmount > 0 && (
                                  <span className="text-[9px] text-muted-foreground line-through leading-tight block mt-0.5">
                                    {formatCurrency((tx as any).originalAmount, tx.currency)}
                                  </span>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(tx);
                                }}
                                aria-label="Edit transaction"
                              >
                                <IconEdit className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Collapsible Items list */}
                          {tx.isReceipt && (() => {
                            try {
                              const items = tx.receiptItems ? (typeof tx.receiptItems === "string" ? JSON.parse(tx.receiptItems) : tx.receiptItems) : [];
                              if (Array.isArray(items) && items.length > 0) {
                                return (
                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="overflow-hidden w-full z-10"
                                      >
                                        <div className="w-full pt-2.5 border-t border-border/20 flex flex-col gap-2 mt-1">
                                          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase mb-0.5 px-0.5">
                                            Items ({items.length})
                                          </span>
                                          {(() => {
                                            const sharedItems: any[] = [];
                                            const singleItemsByPerson: Record<string, any[]> = {};

                                            items.forEach((item: any) => {
                                              const itemAssigned = Array.isArray(item.assigned) ? item.assigned : ["Me"];
                                              if (itemAssigned.length > 1) {
                                                sharedItems.push(item);
                                              } else {
                                                const person = itemAssigned[0] || "Me";
                                                if (!singleItemsByPerson[person]) {
                                                  singleItemsByPerson[person] = [];
                                                }
                                                singleItemsByPerson[person].push(item);
                                              }
                                            });

                                            return (
                                              <div className="flex flex-col gap-2.5">
                                                {sharedItems.length > 0 && (
                                                  <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold tracking-wider text-muted-foreground/80 uppercase px-0.5">
                                                      Shared:
                                                    </span>
                                                    <div className="flex flex-col gap-1 pl-1.5 pr-0.5">
                                                      {sharedItems.map((item: any, idx: number) => {
                                                        const itemAssigned = Array.isArray(item.assigned) ? item.assigned : ["Me"];
                                                        return (
                                                          <div key={`shared-${idx}`} className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                                            <div className="flex justify-between items-center">
                                                              <span className="truncate max-w-[220px]">
                                                                • {item.name}{" "}
                                                                <span className="text-[10px] text-muted-foreground/60 font-medium">
                                                                  ({itemAssigned.join(", ")})
                                                                </span>
                                                              </span>
                                                              <span className="font-sans font-semibold text-foreground shrink-0">
                                                                {formatCurrency(item.price, tx.currency)}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                )}

                                                {Object.entries(singleItemsByPerson).map(([person, pItems]) => (
                                                  <div key={person} className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-bold tracking-wider text-muted-foreground/80 uppercase px-0.5">
                                                      {person}:
                                                    </span>
                                                    <div className="flex flex-col gap-1 pl-1.5 pr-0.5">
                                                      {pItems.map((item: any, idx: number) => (
                                                        <div key={`single-${person}-${idx}`} className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                                          <div className="flex justify-between items-center">
                                                            <span className="truncate max-w-[220px]">• {item.name}</span>
                                                            <span className="font-sans font-semibold text-foreground shrink-0">
                                                              {formatCurrency(item.price, tx.currency)}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })()}
     
                                           {/* Settlement List */}
                                          {Array.isArray((tx as any).settlementsList) && (tx as any).settlementsList.length > 0 && (
                                            <div className="mt-3 pt-2.5 border-t border-border/10 flex flex-col gap-1.5">
                                              <span className="text-[9px] font-bold tracking-wider text-primary uppercase mb-0.5 px-0.5">
                                                Settlements (Paid Back)
                                              </span>
                                              <div className="flex flex-col gap-1 pl-1.5 pr-0.5">
                                                {(tx as any).settlementsList.map((settle: any, sIdx: number) => {
                                                  const cleanSettleDesc = cleanDescription(settle.description)
                                                    .replace(/^Settled Bill with [^:]+:\s*/i, "");
                                                  return (
                                                    <div key={sIdx} className="flex justify-between items-center text-xs text-primary font-medium">
                                                      <span>✓ {cleanSettleDesc || `Settled share`}</span>
                                                      <span className="font-sans font-bold">
                                                        +{formatCurrency(settle.amount, tx.currency)}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                );
                              }
                            } catch {
                              return null;
                            }
                            return null;
                          })()}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Load More Button */}
        {displayHasMore && displayTransactions.length > 0 && !isLoading && syncStatus !== "syncing" && (
          <div className="flex justify-center mt-4 pb-6 px-1">
            {isLoadingMore ? (
              <div className="flex justify-center py-2">
                <IconLoader className="size-5 animate-spin text-primary" />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPage((prev) => {
                    const nextPage = prev + 1;
                    if (typeof window !== "undefined" && navigator.onLine) {
                      loadData(nextPage, true);
                    }
                    return nextPage;
                  });
                }}
                disabled={isLoadingMore}
                className="w-full max-w-[280px] h-10 rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                Load More Transactions
              </Button>
            )}
          </div>
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
              <DialogTitle className="font-sans text-xl">
                Edit Transaction
              </DialogTitle>
              <DialogDescription className="text-xs">
                Balance will be adjusted automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 flex flex-col gap-4 py-3 min-h-0">
              {/* Mode Selector */}
              <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border border-border/10">
                <button
                  type="button"
                  onClick={() => handleEditModeChange(false)}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    !editIsReceipt
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Single Transaction
                </button>
                <button
                  type="button"
                  onClick={() => handleEditModeChange(true)}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    editIsReceipt
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Receipt Mode
                </button>
              </div>

              {!editIsReceipt ? (
                <>
                  {/* Type Selector */}
                  <div className="flex bg-muted p-1 rounded-lg border border-border/20">
                    {(["expense", "income"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          handleEditTypeChange(type);
                          if (type === "income") {
                            setEditIsReceipt(false);
                          }
                        }}
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

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Amount
                    </Label>
                    <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-xl px-3 focus-within:border-primary transition-colors h-11">
                      <span className="text-sm font-bold text-muted-foreground mr-1.5 select-none">
                        {editing?.currency === "IDR" ? "Rp" : "¥"}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editAmount}
                        onChange={(e) => setEditAmount(formatInputAmount(e.target.value))}
                        className="flex-1 h-full text-sm font-bold font-sans tracking-wide bg-transparent focus:outline-none text-foreground"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Account */}
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

                  {/* Expense categories */}
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

                  {/* Income categories */}
                  {editType === "income" && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Sub-category
                      </Label>
                      <Select
                        value={editSubCategory}
                        onValueChange={(value) => setEditSubCategory(value)}
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

                  {/* Description */}
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

                  {/* Date */}
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
                </>
              ) : (
                <>
                  {/* 1. Description */}
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

                  {/* 2. Receipt Items Card */}
                  <div className="flex flex-col gap-3 p-3 bg-muted/40 border border-border/50 rounded-xl">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Receipt Items ({editReceiptItems.length})
                    </Label>

                    {/* Items list */}
                    {editReceiptItems.length > 0 ? (
                      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto overflow-x-hidden pr-1">
                        {editReceiptItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-border/30 px-3 py-1.5 rounded-lg text-xs">
                            <span className="font-semibold text-foreground truncate max-w-[150px]">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-muted-foreground">
                                {editing?.currency === "IDR" ? "Rp" : "¥"}{item.price.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditReceiptItems((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-md transition-colors cursor-pointer"
                              >
                                <IconTrash className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Display Total inside Card */}
                        {editReceiptItems.length > 0 && (
                          <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2 px-1">
                            <span className="text-xs font-semibold text-muted-foreground">Total Amount</span>
                            <span className="text-sm font-bold text-foreground">
                              {editing?.currency === "IDR" ? "Rp" : "¥"}{totalReceiptAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 px-4 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-dashed border-border/50 rounded-lg">
                        No items added yet. Add manually below.
                      </div>
                    )}

                    {/* Add manual item form */}
                    <div className="flex flex-col gap-1.5 mt-1 pt-1 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                        Add Item Manually
                      </span>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Item name"
                          value={editNewItemName}
                          onChange={(e) => setEditNewItemName(e.target.value)}
                          className="h-8 text-xs flex-1 rounded-lg"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground select-none">
                            {editing?.currency === "IDR" ? "Rp" : "¥"}
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Price"
                            value={editNewItemPrice}
                            onChange={(e) => setEditNewItemPrice(formatInputAmount(e.target.value))}
                            className="h-8 text-xs pl-7 rounded-lg font-semibold"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg shrink-0 cursor-pointer"
                          onClick={() => {
                            if (!editNewItemName.trim()) {
                              toast.error("Item name cannot be empty");
                              return;
                            }
                            const parsed = parseInputAmount(editNewItemPrice);
                            if (parsed <= 0) {
                              toast.error("Price must be greater than 0");
                              return;
                            }
                            setEditReceiptItems((prev) => [...prev, { name: editNewItemName.trim(), price: parsed }]);
                            setEditNewItemName("");
                            setEditNewItemPrice("");
                          }}
                        >
                          <IconPlus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Account */}
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

                  {/* 4. Category */}
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
                        <SelectItem value="adjustment" className="text-sm">
                          Adjustment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5. Sub-category */}
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

                  {/* 6. Date */}
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
                </>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 flex flex-row gap-2 w-full sm:space-x-0 sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => {
                  setDeleting(editing);
                  setEditing(null);
                }}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold h-10 rounded-xl"
              >
                <IconTrash className="size-3.5" />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold h-10 rounded-xl"
              >
                {isSaving ? (
                  <IconLoader className="size-3.5 animate-spin" />
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
            <DialogTitle className="font-sans">Delete Transaction</DialogTitle>
            <DialogDescription className="text-xs">
              This will remove the transaction and reverse its balance effect.
            </DialogDescription>
          </DialogHeader>

          {deleting && (
            <div className="rounded-2xl border border-border/40 bg-muted/40 p-3">
              <p className="text-sm font-semibold">
                {cleanDescription(deleting.description) || deleting.category.replace(/_/g, " ")}
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
