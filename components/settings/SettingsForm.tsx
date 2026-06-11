"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { updateUserSettingsAction, updateAccountsAction } from "@/lib/actions/settings";
import { formatJPY, formatIDR } from "@/lib/format";
import {
  IconCheck,
  IconLoader,
  IconAlertCircle,
  IconLogout,
  IconSettings,
  IconCreditCard,
  IconUser,
  IconCurrencyYen
} from "@tabler/icons-react";

interface UserSettingsData {
  monthlyBudget: number;
  pocketMoneyLimit: number;
  shoppingLimit: number;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
  isActive: boolean;
}

interface SettingsFormProps {
  userId: string;
  userSettings: UserSettingsData;
  accounts: AccountItem[];
  profile: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function SettingsForm({
  userId,
  userSettings,
  accounts,
  profile,
}: SettingsFormProps) {
  // 1. Budget Settings State
  const [monthlyBudget, setMonthlyBudget] = useState(String(userSettings.monthlyBudget));
  const [pocketMoneyLimit, setPocketMoneyLimit] = useState(String(userSettings.pocketMoneyLimit));
  const [shoppingLimit, setShoppingLimit] = useState(String(userSettings.shoppingLimit));
  
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // 2. Account Settings State
  const [accountStates, setAccountStates] = useState<AccountItem[]>(accounts);
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);
  const [accountsSuccess, setAccountsSuccess] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const handleAccountChange = (id: string, field: keyof AccountItem, value: any) => {
    setAccountStates((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, [field]: value } : acc))
    );
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBudget(true);
    setBudgetSuccess(false);
    setBudgetError(null);

    const budgetVal = parseFloat(monthlyBudget);
    const pocketVal = parseFloat(pocketMoneyLimit);
    const shoppingVal = parseFloat(shoppingLimit);

    if (isNaN(budgetVal) || isNaN(pocketVal) || isNaN(shoppingVal)) {
      setBudgetError("Please enter valid numbers for budget limits");
      setIsSavingBudget(false);
      return;
    }

    try {
      const res = await updateUserSettingsAction({
        userId,
        monthlyBudget: budgetVal,
        pocketMoneyLimit: pocketVal,
        shoppingLimit: shoppingVal,
      });

      if (res.success) {
        setBudgetSuccess(true);
        setTimeout(() => setBudgetSuccess(false), 2000);
      } else {
        setBudgetError(res.error || "Failed to save budget settings");
      }
    } catch (err) {
      setBudgetError("An unexpected error occurred");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccounts(true);
    setAccountsSuccess(false);
    setAccountsError(null);

    // Validate account values
    for (const acc of accountStates) {
      if (!acc.name.trim()) {
        setAccountsError("Account names cannot be empty");
        setIsSavingAccounts(false);
        return;
      }
      if (isNaN(acc.balance)) {
        setAccountsError("Balances must be valid numbers");
        setIsSavingAccounts(false);
        return;
      }
    }

    try {
      const res = await updateAccountsAction(userId, accountStates);
      if (res.success) {
        setAccountsSuccess(true);
        setTimeout(() => setAccountsSuccess(false), 2000);
      } else {
        setAccountsError(res.error || "Failed to update accounts");
      }
    } catch (err) {
      setAccountsError("An unexpected error occurred");
    } finally {
      setIsSavingAccounts(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex flex-col gap-6 flex-1 pb-10">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your budget limits, active financial accounts, and profile settings.
        </p>
      </div>

      {/* 1. Budget Settings Section */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconCurrencyYen className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Budget Settings (JPY)</h2>
        </div>

        {budgetError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{budgetError}</span>
          </div>
        )}

        <form onSubmit={handleSaveBudget} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground">
              Monthly Expected Budget
            </label>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="h-10 px-3 border border-border/60 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-muted-foreground">
                Pocket Money Limit
              </label>
              <input
                type="number"
                value={pocketMoneyLimit}
                onChange={(e) => setPocketMoneyLimit(e.target.value)}
                className="h-10 px-3 border border-border/60 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-muted-foreground">
                Shopping Limit
              </label>
              <input
                type="number"
                value={shoppingLimit}
                onChange={(e) => setShoppingLimit(e.target.value)}
                className="h-10 px-3 border border-border/60 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            disabled={isSavingBudget}
          >
            {isSavingBudget ? (
              <>
                <IconLoader className="size-4 animate-spin" />
                Saving...
              </>
            ) : budgetSuccess ? (
              <>
                <IconCheck className="size-4" />
                Saved successfully!
              </>
            ) : (
              "Save Budget Settings"
            )}
          </button>
        </form>
      </div>

      {/* 2. Account Settings Section */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconCreditCard className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Financial Accounts</h2>
        </div>

        {accountsError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{accountsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveAccounts} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {accountStates.map((acc) => (
              <div
                key={acc.id}
                className="p-3 bg-background border border-border/40 rounded-xl flex flex-col gap-2.5"
              >
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={acc.name}
                    onChange={(e) => handleAccountChange(acc.id, "name", e.target.value)}
                    className="h-7 px-2 border-b border-transparent hover:border-border focus:border-primary bg-transparent text-xs font-bold text-foreground focus:outline-none transition-colors"
                  />
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground select-none cursor-pointer">
                    <span>Active</span>
                    <input
                      type="checkbox"
                      checked={acc.isActive}
                      onChange={(e) => handleAccountChange(acc.id, "isActive", e.target.checked)}
                      className="size-3.5 accent-primary rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                    Balance ({acc.currency}):
                  </span>
                  <div className="flex items-center gap-1 flex-1 max-w-[150px] ml-auto">
                    <span className="text-xs font-bold text-muted-foreground">
                      {acc.currency === "JPY" ? "¥" : "Rp"}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={acc.balance}
                      onChange={(e) =>
                        handleAccountChange(acc.id, "balance", parseFloat(e.target.value) || 0)
                      }
                      className="w-full h-8 px-2 border border-border rounded-lg text-xs font-semibold text-right focus:outline-none focus:border-primary bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            disabled={isSavingAccounts}
          >
            {isSavingAccounts ? (
              <>
                <IconLoader className="size-4 animate-spin" />
                Saving...
              </>
            ) : accountsSuccess ? (
              <>
                <IconCheck className="size-4" />
                Saved successfully!
              </>
            ) : (
              "Save Account Settings"
            )}
          </button>
        </form>
      </div>

      {/* 3. Profile & Sign Out Section */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-2xs rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconUser className="size-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Google Account Profile</h2>
        </div>

        <div className="flex items-center gap-4 py-2">
          {profile.image && (
            <img src={profile.image} alt="Avatar" className="size-12 rounded-full border shadow-sm" />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground leading-tight">
              {profile.name || "Guest User"}
            </span>
            <span className="text-xs text-muted-foreground leading-none">
              {profile.email || "No email linked"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full h-11 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          <IconLogout className="size-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
