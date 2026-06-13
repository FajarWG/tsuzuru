"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  updateUserSettingsAction,
  resetUserSettingsAndDataAction,
} from "@/lib/actions/settings";
import {
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
} from "@/lib/actions/accounts";
import TemplatesConfigList from "@/components/templates/TemplatesConfigList";
import {
  IconCalendarRepeat,
  IconCheck,
  IconCreditCard,
  IconCurrencyYen,
  IconLoader,
  IconLogout,
  IconSettings,
  IconUser,
  IconEdit,
  IconTrash,
  IconPlus,
  IconWallet,
  IconChevronDown,
  IconChevronUp,
  IconBuildingBank,
  IconActivity,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatInputAmount, parseInputAmount } from "@/lib/format";

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
  defaultTab?: string;
}

function formatCurrency(amount: number, currency: string) {
  return currency === "JPY"
    ? `¥${Number(amount).toLocaleString()}`
    : `Rp${Number(amount).toLocaleString("id-ID")}`;
}

export default function SettingsForm({
  userId,
  userSettings,
  accounts,
  templates,
  profile,
  defaultTab = "templates",
}: SettingsFormProps) {
  const [budgetOpen, setBudgetOpen] = useState(false);

  // Collapse states for profile tab cards
  const [showAccounts, setShowAccounts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(
    formatInputAmount(userSettings.monthlyBudget),
  );
  const [pocketMoneyLimit, setPocketMoneyLimit] = useState(
    formatInputAmount(userSettings.pocketMoneyLimit),
  );
  const [shoppingLimit, setShoppingLimit] = useState(
    formatInputAmount(userSettings.shoppingLimit),
  );
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);

  // Main Currency state
  const [mainCurrency, setMainCurrency] = useState(userSettings.budgetCurrency || "JPY");
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [currencySuccess, setCurrencySuccess] = useState(false);

  // Reset Account Data state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveCurrency = async () => {
    setIsSavingCurrency(true);
    try {
      const res = await updateUserSettingsAction({
        userId,
        monthlyBudget: parseInputAmount(monthlyBudget),
        pocketMoneyLimit: parseInputAmount(pocketMoneyLimit),
        shoppingLimit: parseInputAmount(shoppingLimit),
        budgetCurrency: mainCurrency,
      });

      if (res.success) {
        toast.success("Main currency updated successfully");
        setCurrencySuccess(true);
        setTimeout(() => setCurrencySuccess(false), 2000);
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to update main currency");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const budgetCurrencySymbol = userSettings.budgetCurrency === "JPY" ? "¥" : "Rp";
  const budgetCurrencyPadding = userSettings.budgetCurrency === "JPY" ? "pl-7" : "pl-9";

  // Accounts CRUD state
  const [accountList, setAccountList] = useState<AccountItem[]>(accounts);

  // Add Account Dialog state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccName, setAddAccName] = useState("");
  const [addAccCurrency, setAddAccCurrency] = useState("JPY");
  const [addAccType, setAddAccType] = useState("bank");
  const [addAccBalance, setAddAccBalance] = useState("");
  const [isAddingAcc, setIsAddingAcc] = useState(false);

  // Edit Account Dialog state
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(
    null,
  );
  const [editAccName, setEditAccName] = useState("");
  const [editAccCurrency, setEditAccCurrency] = useState("JPY");
  const [editAccType, setEditAccType] = useState("bank");
  const [editAccBalance, setEditAccBalance] = useState("");
  const [editAccIsActive, setEditAccIsActive] = useState(true);
  const [isSavingAcc, setIsSavingAcc] = useState(false);

  // Delete Account Dialog state
  const [deletingAccount, setDeletingAccount] = useState<AccountItem | null>(
    null,
  );
  const [isDeletingAcc, setIsDeletingAcc] = useState(false);

  const handleSaveBudget = async () => {
    const budgetVal = parseInputAmount(monthlyBudget);
    const pocketVal = parseInputAmount(pocketMoneyLimit);
    const shoppingVal = parseInputAmount(shoppingLimit);

    setIsSavingBudget(true);

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
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to save");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingBudget(false);
    }
  };

  // --- Add Account Handler ---
  const handleAddAccount = async () => {
    if (!addAccName.trim()) {
      toast.error("Please enter account name");
      return;
    }
    const parsedBalance = addAccType === "credit_card" ? 0 : parseInputAmount(addAccBalance);

    setIsAddingAcc(true);

    try {
      const res = await createAccountAction({
        name: addAccName.trim(),
        currency: addAccCurrency,
        balance: parsedBalance,
        type: addAccType,
      });

      if (res.success && res.account) {
        toast.success("Account created successfully");
        setAccountList((prev) =>
          [...prev, res.account as AccountItem].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setAddAccountOpen(false);
        setAddAccName("");
        setAddAccBalance("");
        setAddAccCurrency("JPY");
        setAddAccType("bank");
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to create account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsAddingAcc(false);
    }
  };

  // --- Edit Account Handler ---
  const openEditAccount = (acc: AccountItem) => {
    setEditingAccount(acc);
    setEditAccName(acc.name);
    setEditAccCurrency(acc.currency);
    setEditAccType(acc.type);
    setEditAccBalance(formatInputAmount(acc.balance));
    setEditAccIsActive(acc.isActive);
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    if (!editAccName.trim()) {
      toast.error("Please enter account name");
      return;
    }
    const parsedBalance = editAccType === "credit_card" ? (editingAccount.type === "credit_card" ? editingAccount.balance : 0) : parseInputAmount(editAccBalance);

    setIsSavingAcc(true);

    try {
      const res = await updateAccountAction(editingAccount.id, {
        name: editAccName.trim(),
        currency: editAccCurrency,
        balance: parsedBalance,
        type: editAccType,
        isActive: editAccIsActive,
      });

      if (res.success && res.account) {
        toast.success("Account updated successfully");
        setAccountList((prev) =>
          prev
            .map((a) =>
              a.id === editingAccount.id ? (res.account as AccountItem) : a,
            )
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setEditingAccount(null);
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to update account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingAcc(false);
    }
  };

  // --- Delete Account Handler ---
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    setIsDeletingAcc(true);

    try {
      const res = await deleteAccountAction(deletingAccount.id);

      if (res.success) {
        toast.success("Account deleted successfully");
        setAccountList((prev) =>
          prev.filter((a) => a.id !== deletingAccount.id),
        );
        setDeletingAccount(null);
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to delete account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeletingAcc(false);
    }
  };

  // --- Reset Account Data Handler ---
  const handleResetAccountData = async () => {
    if (resetConfirmText !== "RESET") return;

    setIsResetting(true);
    try {
      const res = await resetUserSettingsAndDataAction();
      if (res.success) {
        toast.success("Account data reset successfully");
        setResetDialogOpen(false);
        setResetConfirmText("");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to reset account data");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  const accountsForTemplates = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    balance: a.balance,
    type: a.type,
    isActive: a.isActive,
  }));

  return (
    <div className="flex flex-col gap-5 flex-1 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.05 }}
      >
        <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage recurring bills, budget, accounts, and profile.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
        className="flex flex-col gap-4 flex-1"
      >
        <Tabs key={defaultTab} defaultValue={defaultTab} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="templates" className="text-[10px] cursor-pointer">
            <IconCalendarRepeat className="size-3.5" />
            Bills
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-[10px] cursor-pointer">
            <IconCurrencyYen className="size-3.5" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-[10px] cursor-pointer">
            <IconUser className="size-3.5" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-0">
          <section className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5">
            <TemplatesConfigList
              templates={templates}
              accounts={accountsForTemplates}
            />
          </section>
        </TabsContent>

        <TabsContent value="budget" className="mt-0">
          <section className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/20">
              <div className="flex items-center gap-2">
                <IconCurrencyYen className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Budget Limits
                </h2>
              </div>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => {
                  setMonthlyBudget(formatInputAmount(userSettings.monthlyBudget));
                  setPocketMoneyLimit(formatInputAmount(userSettings.pocketMoneyLimit));
                  setShoppingLimit(formatInputAmount(userSettings.shoppingLimit));
                  setBudgetOpen(true);
                  setBudgetSuccess(false);
                }}
                aria-label="Edit budget settings"
                className="cursor-pointer size-8 rounded-lg"
              >
                <IconSettings className="size-3.5" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                  <IconCurrencyYen className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Monthly Expected Budget
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5">
                    {formatCurrency(userSettings.monthlyBudget, userSettings.budgetCurrency)}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Main spending limit for the entire month across all
                    financial accounts. Used to calculate overall remaining
                    balance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
                <div className="p-2 bg-primary/15 text-primary/80 rounded-lg shrink-0">
                  <IconWallet className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Pocket Money Limit
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5">
                    {formatCurrency(userSettings.pocketMoneyLimit, userSettings.budgetCurrency)}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Allowance allocated for daily items, snacks, transport, and
                    other flexible pocket money expenses.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg shrink-0">
                  <IconCreditCard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Shopping Limit
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5">
                    {formatCurrency(userSettings.shoppingLimit, userSettings.budgetCurrency)}
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Allocation designated for non-daily purchases like buying
                    clothing, electronics, and household goods.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="profile" className="mt-0 flex flex-col gap-4">
          {/* Accounts Card */}
          <section className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
            <div 
              className={cn(
                "flex items-center justify-between cursor-pointer select-none transition-all",
                showAccounts ? "pb-2 border-b border-border/20" : ""
              )}
              onClick={() => setShowAccounts((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <IconWallet className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Financial Accounts</h2>
                {showAccounts && (
                  <IconChevronUp className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {showAccounts ? (
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddAccName("");
                      setAddAccBalance("");
                      setAddAccCurrency("JPY");
                      setAddAccType("bank");
                      setAddAccountOpen(true);
                    }}
                    aria-label="Add financial account"
                    className="cursor-pointer size-8 rounded-lg"
                  >
                    <IconPlus className="size-3.5" />
                  </Button>
                ) : (
                  <IconChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showAccounts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pt-2">
                    {accountList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No accounts added yet.
                      </p>
                    ) : (
                      accountList.map((acc) => (
                        <div
                          key={acc.id}
                          className={cn(
                            "flex items-center justify-between gap-3 p-3 bg-muted/40 border border-border/25 rounded-xl hover:bg-muted/70 transition-colors",
                            !acc.isActive && "opacity-60",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-2xs border border-border/20">
                              {acc.type === "investment" ? (
                                <IconActivity className="size-4 text-emerald-600 dark:text-emerald-400" />
                              ) : acc.type === "credit_card" ? (
                                <IconCreditCard className="size-4 text-rose-500 dark:text-rose-400" />
                              ) : acc.type === "ewallet" ? (
                                <IconWallet className="size-4 text-amber-500 dark:text-amber-400" />
                              ) : (
                                <IconBuildingBank className="size-4 text-blue-500 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate text-xs font-semibold text-foreground leading-tight">
                                {acc.name}
                              </span>
                              <span className="truncate text-[10px] text-muted-foreground leading-none capitalize">
                                {acc.type === "credit_card" ? "Credit Card" : acc.type === "ewallet" ? "E-Wallet" : acc.type} · {acc.currency}{" "}
                                {!acc.isActive && "· Inactive"}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-sans font-bold text-foreground mr-1">
                              {formatCurrency(acc.balance, acc.currency)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEditAccount(acc)}
                              aria-label="Edit account"
                              className="cursor-pointer"
                            >
                              <IconEdit className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          {/* Profile Card */}
          <section className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
            <div 
              className={cn(
                "flex items-center justify-between cursor-pointer select-none transition-all",
                showProfile ? "pb-2 border-b border-border/20" : ""
              )}
              onClick={() => setShowProfile((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <IconUser className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Profile</h2>
              </div>
              {showProfile ? (
                <IconChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <IconChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>

            <AnimatePresence initial={false}>
              {showProfile && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center gap-3">
                      {profile.image && (
                        <img
                          src={profile.image}
                          alt="Avatar"
                          className="size-11 rounded-full border shadow-sm"
                        />
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-foreground leading-tight">
                          {profile.name || "Google User"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground leading-none">
                          {profile.email || "No email linked"}
                        </span>
                      </div>
                    </div>

                    {/* Main Currency Setting */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-border/20">
                      <Label className="text-xs font-semibold">Main Currency</Label>
                      <div className="flex gap-2">
                        <Select value={mainCurrency} onValueChange={setMainCurrency}>
                          <SelectTrigger className="h-10 text-xs font-semibold flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="JPY" className="text-xs">
                              JPY (¥)
                            </SelectItem>
                            <SelectItem value="IDR" className="text-xs">
                              IDR (Rp)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={handleSaveCurrency}
                          disabled={isSavingCurrency}
                          className="h-10 min-w-[72px] text-xs font-medium cursor-pointer"
                        >
                          {isSavingCurrency ? (
                            <IconLoader className="size-3.5 animate-spin" />
                          ) : currencySuccess ? (
                            <IconCheck className="size-3.5" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                        This sets your base budget currency. Dashboard widgets will format and track limits in this currency.
                      </p>
                    </div>

                    {/* Danger Zone */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-border/20">
                      <div 
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setShowDangerZone((v) => !v)}
                      >
                        <Label className="text-xs font-semibold text-destructive cursor-pointer">Danger Zone</Label>
                        {showDangerZone ? (
                          <IconChevronUp className="size-4 text-destructive" />
                        ) : (
                          <IconChevronDown className="size-4 text-destructive" />
                        )}
                      </div>
                      
                      <AnimatePresence initial={false}>
                        {showDangerZone && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2 pt-2">
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Permanently delete all accounts, transactions, bills, and reset settings.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setResetDialogOpen(true)}
                                className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/80 transition-colors cursor-pointer"
                              >
                                <IconTrash className="size-4" />
                                Reset Account Data
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full gap-2 cursor-pointer mt-2"
                    >
                      <IconLogout className="size-4" />
                      Sign Out
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Budget Settings Dialog */}
      <Dialog
        open={budgetOpen}
        onOpenChange={(open) => {
          if (!isSavingBudget) setBudgetOpen(open);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Budget Settings</DialogTitle>
              <DialogDescription className="text-xs">
                Set your monthly spending limits in {userSettings.budgetCurrency}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Monthly Expected Budget
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                    {budgetCurrencySymbol}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(formatInputAmount(e.target.value))}
                    className={cn(budgetCurrencyPadding, "h-10 font-semibold")}
                    placeholder="150,000"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">
                    Pocket Money Limit
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                      {budgetCurrencySymbol}
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={pocketMoneyLimit}
                      onChange={(e) => setPocketMoneyLimit(formatInputAmount(e.target.value))}
                      className={cn(budgetCurrencyPadding, "h-10 font-semibold")}
                      placeholder="40,000"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Shopping Limit</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                      {budgetCurrencySymbol}
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={shoppingLimit}
                      onChange={(e) => setShoppingLimit(formatInputAmount(e.target.value))}
                      className={cn(budgetCurrencyPadding, "h-10 font-semibold")}
                      placeholder="60,000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBudgetOpen(false)}
                disabled={isSavingBudget}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBudget}
                disabled={isSavingBudget}
                className="min-w-[72px] cursor-pointer"
              >
                {isSavingBudget ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : budgetSuccess ? (
                  <>
                    <IconCheck className="size-4" /> Saved
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog
        open={addAccountOpen}
        onOpenChange={(open) => {
          if (!isAddingAcc) setAddAccountOpen(open);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Add Account</DialogTitle>
              <DialogDescription className="text-xs">
                Create a new financial account.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Account Name</Label>
                <Input
                  value={addAccName}
                  onChange={(e) => setAddAccName(e.target.value)}
                  className="h-10 font-semibold"
                  placeholder="e.g. Yucho Bank"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select
                    value={addAccCurrency}
                    onValueChange={setAddAccCurrency}
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY" className="text-xs">
                        JPY (¥)
                      </SelectItem>
                      <SelectItem value="IDR" className="text-xs">
                        IDR (Rp)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Account Type</Label>
                  <Select value={addAccType} onValueChange={setAddAccType}>
                    <SelectTrigger className="h-10 text-xs font-semibold capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank" className="text-xs font-medium">
                        Bank
                      </SelectItem>
                      <SelectItem
                        value="ewallet"
                        className="text-xs font-medium font-sans"
                      >
                        E-Wallet
                      </SelectItem>
                      <SelectItem
                        value="credit_card"
                        className="text-xs font-medium font-sans"
                      >
                        Credit Card
                      </SelectItem>
                      <SelectItem
                        value="investment"
                        className="text-xs font-medium"
                      >
                        Investment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {addAccType !== "credit_card" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Initial Balance</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={addAccBalance}
                    onChange={(e) => setAddAccBalance(formatInputAmount(e.target.value))}
                    className="h-10 font-semibold"
                    placeholder="0"
                    required
                  />
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddAccountOpen(false)}
                disabled={isAddingAcc}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddAccount}
                disabled={isAddingAcc}
                className="min-w-[72px] cursor-pointer"
              >
                {isAddingAcc ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!isSavingAcc && !open) setEditingAccount(null);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Edit Account</DialogTitle>
              <DialogDescription className="text-xs">
                Update financial account details.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Account Name</Label>
                <Input
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="h-10 font-semibold"
                  placeholder="e.g. Yucho Bank"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select
                    value={editAccCurrency}
                    onValueChange={setEditAccCurrency}
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY" className="text-xs">
                        JPY (¥)
                      </SelectItem>
                      <SelectItem value="IDR" className="text-xs">
                        IDR (Rp)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Account Type</Label>
                  <Select value={editAccType} onValueChange={setEditAccType}>
                    <SelectTrigger className="h-10 text-xs font-semibold capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank" className="text-xs font-medium">
                        Bank
                      </SelectItem>
                      <SelectItem
                        value="ewallet"
                        className="text-xs font-medium font-sans"
                      >
                        E-Wallet
                      </SelectItem>
                      <SelectItem
                        value="credit_card"
                        className="text-xs font-medium font-sans"
                      >
                        Credit Card
                      </SelectItem>
                      <SelectItem
                        value="investment"
                        className="text-xs font-medium"
                      >
                        Investment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editAccType !== "credit_card" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Balance</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={editAccBalance}
                    onChange={(e) => setEditAccBalance(formatInputAmount(e.target.value))}
                    className="h-10 font-semibold"
                    placeholder="0"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/10">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-xs font-semibold">Active Status</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Inactive accounts are hidden from transaction entry fields.
                  </span>
                </div>
                <Switch
                  checked={editAccIsActive}
                  onCheckedChange={setEditAccIsActive}
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 flex-row justify-between items-center gap-2 sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={() => {
                  if (editingAccount) {
                    setDeletingAccount(editingAccount);
                    setEditingAccount(null);
                  }
                }}
                disabled={isSavingAcc}
              >
                <IconTrash className="size-4 mr-1" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAccount(null)}
                  disabled={isSavingAcc}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAccount}
                  disabled={isSavingAcc}
                  className="min-w-[72px] cursor-pointer"
                >
                  {isSavingAcc ? (
                    <IconLoader className="size-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={!!deletingAccount}
        onOpenChange={(open) => {
          if (!isDeletingAcc && !open) setDeletingAccount(null);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans text-destructive">
                Delete Account
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-foreground font-bold">
                  &ldquo;{deletingAccount?.name}&rdquo;
                </strong>
                ?
                <span className="block mt-1 text-destructive font-semibold">
                  ⚠️ WARNING: All transactions and recurring bill templates linked
                  to this account will be permanently deleted! This action cannot
                  be undone.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAccount(null)}
                disabled={isDeletingAcc}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={isDeletingAcc}
                className="min-w-[72px] cursor-pointer"
              >
                {isDeletingAcc ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Account Data Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          if (!isResetting && !open) {
            setResetDialogOpen(false);
            setResetConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans text-destructive flex items-center gap-2">
                Reset Account Data
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                This action is <strong className="text-destructive font-bold">permanent</strong> and <strong className="text-destructive font-bold">cannot be undone</strong>.
                <span className="block mt-2 text-muted-foreground">
                  All transactions, bank/e-wallet accounts, recurring bills, and ledger records will be deleted. Your budget limits will be reset to 0.
                </span>
                <span className="block mt-2 font-medium text-foreground">
                  Please type <code className="bg-muted px-1.5 py-0.5 rounded text-destructive font-mono font-bold">RESET</code> to confirm.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 py-4 flex flex-col gap-4 min-h-0">
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="h-10 text-center font-mono font-bold uppercase tracking-widest text-destructive"
              />
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResetDialogOpen(false);
                  setResetConfirmText("");
                }}
                disabled={isResetting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetAccountData}
                disabled={isResetting || resetConfirmText !== "RESET"}
                className="min-w-[72px] cursor-pointer"
              >
                {isResetting ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Reset All Data"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
