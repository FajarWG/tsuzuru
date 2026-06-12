"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { updateUserSettingsAction } from "@/lib/actions/settings";
import TemplatesConfigList from "@/components/templates/TemplatesConfigList";
import {
  IconLogout,
  IconCreditCard,
  IconUser,
  IconCurrencyYen,
  IconCalendarRepeat,
  IconSettings,
  IconLoader,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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

interface TemplateItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
  isActive: boolean;
  intervalMonths: number;
}

interface SettingsFormProps {
  userId: string;
  userSettings: UserSettingsData;
  accounts: AccountItem[];
  templates: TemplateItem[];
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
  templates,
  profile,
}: SettingsFormProps) {
  // Budget dialog state
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(String(userSettings.monthlyBudget));
  const [pocketMoneyLimit, setPocketMoneyLimit] = useState(String(userSettings.pocketMoneyLimit));
  const [shoppingLimit, setShoppingLimit] = useState(String(userSettings.shoppingLimit));
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const handleSaveBudget = async () => {
    const budgetVal = parseFloat(monthlyBudget);
    const pocketVal = parseFloat(pocketMoneyLimit);
    const shoppingVal = parseFloat(shoppingLimit);

    if (isNaN(budgetVal) || isNaN(pocketVal) || isNaN(shoppingVal)) {
      setBudgetError("Please enter valid numbers");
      return;
    }

    setIsSavingBudget(true);
    setBudgetError(null);

    try {
      const res = await updateUserSettingsAction({
        userId,
        monthlyBudget: budgetVal,
        pocketMoneyLimit: pocketVal,
        shoppingLimit: shoppingVal,
      });

      if (res.success) {
        setBudgetSuccess(true);
        setTimeout(() => {
          setBudgetSuccess(false);
          setBudgetOpen(false);
        }, 1000);
      } else {
        setBudgetError(res.error || "Failed to save");
      }
    } catch {
      setBudgetError("An unexpected error occurred");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  const accountsForTemplates = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));

  return (
    <div className="flex flex-col gap-5 flex-1 pb-10">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your recurring bills, budget, and profile.
        </p>
      </div>

      {/* ====== 1. Monthly Templates (TOP) ====== */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconCalendarRepeat className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Monthly Templates</h2>
        </div>
        <TemplatesConfigList
          hideHeader
          templates={templates}
          accounts={accountsForTemplates}
        />
      </div>

      {/* ====== 2. Budget Settings (Button → Dialog) ====== */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconCurrencyYen className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Budget (JPY)</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Monthly: ¥{Number(userSettings.monthlyBudget).toLocaleString()} · Pocket: ¥{Number(userSettings.pocketMoneyLimit).toLocaleString()} · Shopping: ¥{Number(userSettings.shoppingLimit).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              setBudgetOpen(true);
              setBudgetError(null);
              setBudgetSuccess(false);
            }}
            aria-label="Edit budget settings"
          >
            <IconSettings className="size-4" />
          </Button>
        </div>
      </div>

      {/* ====== 3. Profile & Sign Out ====== */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/20">
          <IconUser className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Profile</h2>
        </div>

        <div className="flex items-center gap-3">
          {profile.image && (
            <img
              src={profile.image}
              alt="Avatar"
              className="size-11 rounded-full border shadow-sm"
            />
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

        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="w-full gap-2"
        >
          <IconLogout className="size-4" />
          Sign Out
        </Button>
      </div>

      {/* ====== Budget Edit Dialog ====== */}
      <Dialog open={budgetOpen} onOpenChange={(open) => { if (!isSavingBudget) setBudgetOpen(open); }}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Budget Settings</DialogTitle>
            <DialogDescription className="text-xs">
              Set your monthly spending limits in JPY.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {budgetError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{budgetError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Monthly Expected Budget</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-muted-foreground">¥</span>
                <Input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="pl-7 h-10 text-sm font-semibold"
                  placeholder="150000"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Pocket Money Limit</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-muted-foreground">¥</span>
                  <Input
                    type="number"
                    value={pocketMoneyLimit}
                    onChange={(e) => setPocketMoneyLimit(e.target.value)}
                    className="pl-7 h-10 text-sm font-semibold"
                    placeholder="40000"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Shopping Limit</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-muted-foreground">¥</span>
                  <Input
                    type="number"
                    value={shoppingLimit}
                    onChange={(e) => setShoppingLimit(e.target.value)}
                    className="pl-7 h-10 text-sm font-semibold"
                    placeholder="60000"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBudgetOpen(false)}
              disabled={isSavingBudget}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBudget}
              disabled={isSavingBudget}
              className="min-w-[72px]"
            >
              {isSavingBudget ? (
                <IconLoader className="size-4 animate-spin" />
              ) : budgetSuccess ? (
                <>
                  <IconCheck className="size-4" /> Saved!
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
