"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import TransactionsList from "@/components/transactions/TransactionsList";
import TransactionsLoading from "@/app/(app)/transactions/loading";
import { getTransactionsDataAction } from "@/lib/actions/transactions";

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  category: string;
  subCategory: string | null;
  mealNumber: number | null;
  description: string | null;
  date: string;
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

interface TransactionsData {
  transactions: TransactionItem[];
  accounts: AccountItem[];
}

interface TransactionsClientProps {
  userId: string;
}

export default function TransactionsClient({ userId }: TransactionsClientProps) {
  const [data, setData] = useState<TransactionsData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tsuzuru_transactions_data");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Guard: prevents background listeners from firing before the initial fetch is done
  const hasInitiallyFetched = useRef(false);

  const syncData = useCallback(async () => {
    try {
      const res = await getTransactionsDataAction();
      if (res.success && res.data) {
        const freshData = res.data as unknown as TransactionsData;
        setData(freshData);
        localStorage.setItem("tsuzuru_transactions_data", JSON.stringify(freshData));
      } else {
        toast.error(res.error || "Failed to fetch latest transaction records.");
      }
    } catch (err) {
      console.error("Error syncing transactions:", err);
      toast.error("Failed to sync transactions with server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Initial fetch — runs exactly once on mount
  useEffect(() => {
    syncData().then(() => {
      hasInitiallyFetched.current = true;
    });
  }, [syncData]);

  // 2. Re-fetch when window regains focus (e.g. switching tabs back)
  //    Guard ensures this does NOT fire during initial page load
  useEffect(() => {
    const handleFocus = () => {
      if (hasInitiallyFetched.current) {
        syncData();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncData]);

  // 3. Re-fetch when tab becomes visible again after being hidden
  //    Only fires on hidden → visible transition, not on initial load
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && hasInitiallyFetched.current) {
        syncData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncData]);

  // 4. Re-fetch when a new transaction is added via the FAB
  useEffect(() => {
    const handleTransactionAdded = () => syncData();
    window.addEventListener("transaction-added", handleTransactionAdded);
    return () => window.removeEventListener("transaction-added", handleTransactionAdded);
  }, [syncData]);

  // Show skeleton on first visit before any data arrives
  if (!data && loading) {
    return <TransactionsLoading />;
  }

  const activeTransactions = data?.transactions || [];
  const activeAccounts = data?.accounts || [];

  return (
    <div className="flex flex-col flex-1">
      <TransactionsList
        userId={userId}
        transactions={activeTransactions}
        accounts={activeAccounts}
      />
    </div>
  );
}
