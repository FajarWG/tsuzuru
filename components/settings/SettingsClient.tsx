"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import SettingsForm from "@/components/settings/SettingsForm";
import SettingsLoading from "@/app/(app)/settings/loading";
import { getUserSettingsDataAction } from "@/lib/actions/settings";

interface UserSettingsData {
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
  budgetCurrency: string;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
  defaultPaymentAccountId?: string | null;
}

interface TemplateItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
  isActive: boolean;
  intervalMonths: number;
}

interface BudgetLimitItem {
  id: string;
  name: string;
  label: string;
  limit: number;
}

interface ProfileItem {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SettingsData {
  userSettings: UserSettingsData;
  accounts: AccountItem[];
  templates: TemplateItem[];
  budgetLimits: BudgetLimitItem[];
  profile: ProfileItem;
  paidTemplateNamesThisMonth?: string[];
}

interface SettingsClientProps {
  userId: string;
  defaultTab?: string;
}

let isGloballyMounted = false;

export default function SettingsClient({ userId, defaultTab = "templates" }: SettingsClientProps) {
  const [data, setData] = useState<SettingsData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("tsuzuru_settings_data");
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        console.warn("Failed to load cached settings data:", e);
        return null;
      }
    }
    return null;
  });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [isMounted, setIsMounted] = useState(isGloballyMounted);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // 1. Set mounted state
  useEffect(() => {
    setIsMounted(true);
    isGloballyMounted = true;
  }, []);

  // 2. Stable sync function using ref
  const syncDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    syncDataRef.current = async () => {
      setSyncStatus("syncing");
      try {
        const res = await getUserSettingsDataAction();
        if (res.success && res.data) {
          const freshData = res.data as unknown as SettingsData;

          setData(freshData);
          localStorage.setItem("tsuzuru_settings_data", JSON.stringify(freshData));
          setSyncStatus("success");
          setTimeout(() => {
            setSyncStatus("idle");
          }, 3500);
        } else {
          setSyncStatus("error");
        }
      } catch (err) {
        console.error("Error syncing settings:", err);
        setSyncStatus("error");
      } finally {
        setIsDataLoading(false);
      }
    };
  }, [data]);

  // 3. Trigger sync on mount and defaultTab change
  useEffect(() => {
    if (!isMounted) return;
    syncDataRef.current();
  }, [isMounted, defaultTab]);

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

  // 4. Trigger sync on custom events (such as adding transaction or editing bills)
  useEffect(() => {
    if (!isMounted) return;

    const handleDataChanged = () => {
      syncDataRef.current();
    };

    window.addEventListener("transaction-added", handleDataChanged);
    window.addEventListener("bill-updated", handleDataChanged);

    return () => {
      window.removeEventListener("transaction-added", handleDataChanged);
      window.removeEventListener("bill-updated", handleDataChanged);
    };
  }, [isMounted]);

  // Render Skeletons if first visit and loading
  if (!isMounted || (!data && isDataLoading)) {
    return <SettingsLoading />;
  }

  // Render client form view
  const userSettings = data?.userSettings || {
    monthlyBudget: 150000,
    pocketMoneyLimit: 40000,
    shoppingLimit: 60000,
    budgetCurrency: "JPY",
  };
  const accounts = data?.accounts || [];
  const templates = data?.templates || [];
  const budgetLimits = data?.budgetLimits || [];
  const profile = data?.profile || {
    name: null,
    email: null,
    image: null,
  };

  return (
    <div className="flex flex-col flex-1">
      <SettingsForm
        userId={userId}
        userSettings={userSettings}
        accounts={accounts}
        templates={templates}
        budgetLimits={budgetLimits}
        profile={profile}
        defaultTab={defaultTab}
        onRefresh={() => syncDataRef.current()}
        syncStatus={syncStatus}
        paidTemplateNamesThisMonth={data?.paidTemplateNamesThisMonth || []}
      />
    </div>
  );
}
