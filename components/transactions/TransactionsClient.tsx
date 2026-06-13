"use client";

import { useEffect, useState, useRef } from "react";
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
  const [data, setData] = useState<TransactionsData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const cached = localStorage.getItem("tsuzuru_transactions_data");
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load cached transactions data:", e);
    }
  }, []);

  // 2. Stable sync function using ref
  const syncDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    syncDataRef.current = async () => {
      try {
        const res = await getTransactionsDataAction();
        if (res.success && res.data) {
          const freshData = res.data as unknown as TransactionsData;

          let isDataChanged = false;
          if (data) {
            // Compare JPY/IDR transaction counts, IDs or exact JSON representation
            const oldHash = JSON.stringify(data);
            const newHash = JSON.stringify(freshData);
            if (oldHash !== newHash) {
              isDataChanged = true;
            }
          } else {
            // First load from DB
            isDataChanged = true;
          }

          setData(freshData);
          localStorage.setItem("tsuzuru_transactions_data", JSON.stringify(freshData));

          // Only toast if transaction balances/items have changed
          if (isDataChanged && data) {
            toast.success("Transactions updated!", {
              description: "Latest transaction ledger has been synchronized.",
            });
          }
        } else {
          toast.error(res.error || "Failed to fetch latest transaction records.");
        }
      } catch (err) {
        console.error("Error syncing transactions:", err);
        toast.error("Failed to sync transactions with server.");
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

  // Render Skeleton if first visit and loading
  if (!isMounted || (!data && loading)) {
    return <TransactionsLoading />;
  }

  // Render client list view
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
