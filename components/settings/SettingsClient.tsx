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

interface ProfileItem {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SettingsData {
  userSettings: UserSettingsData;
  accounts: AccountItem[];
  templates: TemplateItem[];
  profile: ProfileItem;
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
        const res = await getUserSettingsDataAction();
        if (res.success && res.data) {
          const freshData = res.data as unknown as SettingsData;

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
          localStorage.setItem("tsuzuru_settings_data", JSON.stringify(freshData));
        } else {
          toast.error(res.error || "Failed to fetch latest user settings.");
        }
      } catch (err) {
        console.error("Error syncing settings:", err);
        toast.error("Failed to sync settings with server.");
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
  if (!isMounted || (!data && loading)) {
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
        profile={profile}
        defaultTab={defaultTab}
      />
    </div>
  );
}
