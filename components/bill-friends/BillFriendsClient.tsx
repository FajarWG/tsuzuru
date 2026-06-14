"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import BillFriendsList from "@/components/bill-friends/BillFriendsList";
import BillFriendsLoading from "@/app/(app)/bill-friends/loading";
import { getBillFriendsDataAction } from "@/lib/actions/bill-friends";

interface BillItem {
  id: string;
  personName: string;
  amount: number;
  currency: string;
  direction: string;
  description: string | null;
  isSettled: boolean;
  settledAt: string | null;
  createdAt: string;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

interface TransactionItem {
  id: string;
  description: string | null;
  isReceipt: boolean;
  receiptItems: any;
  currency: string;
}

interface BillFriendsData {
  bills: BillItem[];
  accounts: AccountItem[];
  transactions: TransactionItem[];
}

interface BillFriendsClientProps {
  userId: string;
}

let isGloballyMounted = false;

export default function BillFriendsClient({ userId }: BillFriendsClientProps) {
  const [data, setData] = useState<BillFriendsData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tsuzuru_bill_friends_data");
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        console.warn("Failed to load cached bill friends data:", e);
        return null;
      }
    }
    return null;
  });
  const [isMounted, setIsMounted] = useState(isGloballyMounted);
  const [loading, setLoading] = useState(true);

  // 1. Set mounted state
  useEffect(() => {
    setIsMounted(true);
    isGloballyMounted = true;
  }, []);

  // 2. Stable sync function using ref
  const syncDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    syncDataRef.current = async () => {
      try {
        const res = await getBillFriendsDataAction();
        if (res.success && res.data) {
          const freshData = res.data as unknown as BillFriendsData;

          let isDataChanged = false;
          if (data) {
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
          localStorage.setItem("tsuzuru_bill_friends_data", JSON.stringify(freshData));
        } else {
          toast.error(res.error || "Failed to fetch latest bill records.");
        }
      } catch (err) {
        console.error("Error syncing bills:", err);
        toast.error("Failed to sync bills with server.");
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

  // 3.5. Trigger sync on focus / visibility change
  useEffect(() => {
    if (!isMounted) return;

    const handleFocus = () => {
      syncDataRef.current();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isMounted]);

  // 4. Trigger sync on bill-updated event
  useEffect(() => {
    if (!isMounted) return;

    const handleBillUpdated = () => {
      syncDataRef.current();
    };

    window.addEventListener("bill-updated", handleBillUpdated);
    return () => {
      window.removeEventListener("bill-updated", handleBillUpdated);
    };
  }, [isMounted]);

  // Render Skeletons if first visit and loading
  if (!isMounted || (!data && loading)) {
    return <BillFriendsLoading />;
  }

  // Render client list view
  const activeBills = data?.bills || [];
  const activeAccounts = data?.accounts || [];
  const activeTransactions = data?.transactions || [];

  return (
    <div className="flex flex-col flex-1">
      <BillFriendsList bills={activeBills as any} accounts={activeAccounts} transactions={activeTransactions} />
    </div>
  );
}
