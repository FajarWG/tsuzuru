"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { updateUserSettingsAction } from "@/lib/actions/settings";
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
} from "@tabler/icons-react";
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
  const [monthlyBudget, setMonthlyBudget] = useState(
    String(userSettings.monthlyBudget),
  );
  const [pocketMoneyLimit, setPocketMoneyLimit] = useState(
    String(userSettings.pocketMoneyLimit),
  );
  const [shoppingLimit, setShoppingLimit] = useState(
    String(userSettings.shoppingLimit),
  );
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Accounts CRUD state
  const [accountList, setAccountList] = useState<AccountItem[]>(accounts);

  // Add Account Dialog state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccName, setAddAccName] = useState("");
  const [addAccCurrency, setAddAccCurrency] = useState("JPY");
  const [addAccType, setAddAccType] = useState("bank");
  const [addAccBalance, setAddAccBalance] = useState("");
  const [isAddingAcc, setIsAddingAcc] = useState(false);
  const [addAccError, setAddAccError] = useState<string | null>(null);

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
  const [editAccError, setEditAccError] = useState<string | null>(null);

  // Delete Account Dialog state
  const [deletingAccount, setDeletingAccount] = useState<AccountItem | null>(
    null,
  );
  const [isDeletingAcc, setIsDeletingAcc] = useState(false);
  const [deleteAccError, setDeleteAccError] = useState<string | null>(null);

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

  // --- Add Account Handler ---
  const handleAddAccount = async () => {
    if (!addAccName.trim()) {
      setAddAccError("Please enter account name");
      return;
    }
    const parsedBalance = parseFloat(addAccBalance);
    if (isNaN(parsedBalance)) {
      setAddAccError("Please enter a valid balance");
      return;
    }

    setIsAddingAcc(true);
    setAddAccError(null);

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
      } else {
        setAddAccError(res.error || "Failed to create account");
      }
    } catch {
      setAddAccError("An unexpected error occurred");
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
    setEditAccBalance(String(acc.balance));
    setEditAccIsActive(acc.isActive);
    setEditAccError(null);
  };

  const handleSaveAccount = async () => {
    if (!editingAccount) return;
    if (!editAccName.trim()) {
      setEditAccError("Please enter account name");
      return;
    }
    const parsedBalance = parseFloat(editAccBalance);
    if (isNaN(parsedBalance)) {
      setEditAccError("Please enter a valid balance");
      return;
    }

    setIsSavingAcc(true);
    setEditAccError(null);

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
      } else {
        setEditAccError(res.error || "Failed to update account");
      }
    } catch {
      setEditAccError("An unexpected error occurred");
    } finally {
      setIsSavingAcc(false);
    }
  };

  // --- Delete Account Handler ---
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    setIsDeletingAcc(true);
    setDeleteAccError(null);

    try {
      const res = await deleteAccountAction(deletingAccount.id);

      if (res.success) {
        toast.success("Account deleted successfully");
        setAccountList((prev) =>
          prev.filter((a) => a.id !== deletingAccount.id),
        );
        setDeletingAccount(null);
      } else {
        setDeleteAccError(res.error || "Failed to delete account");
      }
    } catch {
      setDeleteAccError("An unexpected error occurred");
    } finally {
      setIsDeletingAcc(false);
    }
  };

  const accountsForTemplates = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));

  return (
    <div className="flex flex-col gap-5 flex-1 pb-10">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Manage recurring bills, budget, accounts, and profile.
        </p>
      </div>

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
            <div className="flex items-center gap-2 mb-4">
              <IconCalendarRepeat className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Monthly Bills
              </h2>
            </div>
            <TemplatesConfigList
              hideHeader
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
                  setBudgetOpen(true);
                  setBudgetError(null);
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
                    ¥{Number(userSettings.monthlyBudget).toLocaleString()}
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
                    ¥{Number(userSettings.pocketMoneyLimit).toLocaleString()}
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
                    ¥{Number(userSettings.shoppingLimit).toLocaleString()}
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
            <div className="flex items-center justify-between pb-2 border-b border-border/20">
              <div className="flex items-center gap-2">
                <IconWallet className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Accounts</h2>
              </div>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => {
                  setAddAccName("");
                  setAddAccBalance("");
                  setAddAccCurrency("JPY");
                  setAddAccType("bank");
                  setAddAccError(null);
                  setAddAccountOpen(true);
                }}
                aria-label="Add financial account"
                className="cursor-pointer size-8 rounded-lg"
              >
                <IconPlus className="size-3.5" />
              </Button>
            </div>

            <div className="flex flex-col gap-2">
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
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-2xs text-primary/80 border border-border/20">
                        <IconCreditCard className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs font-semibold text-foreground leading-tight">
                          {acc.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground leading-none capitalize">
                          {acc.type} · {acc.currency}{" "}
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
          </section>
          {/* Profile Card */}
          <section className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
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
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-bold text-foreground leading-tight">
                  {profile.name || "Google User"}
                </span>
                <span className="truncate text-xs text-muted-foreground leading-none">
                  {profile.email || "No email linked"}
                </span>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full gap-2 cursor-pointer"
            >
              <IconLogout className="size-4" />
              Sign Out
            </Button>
          </section>
        </TabsContent>
      </Tabs>

      {/* Budget Settings Dialog */}
      <Dialog
        open={budgetOpen}
        onOpenChange={(open) => {
          if (!isSavingBudget) setBudgetOpen(open);
        }}
      >
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
                <AlertDescription className="text-xs">
                  {budgetError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">
                Monthly Expected Budget
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                  ¥
                </span>
                <Input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="pl-7 h-10 font-semibold"
                  placeholder="150000"
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
                    ¥
                  </span>
                  <Input
                    type="number"
                    value={pocketMoneyLimit}
                    onChange={(e) => setPocketMoneyLimit(e.target.value)}
                    className="pl-7 h-10 font-semibold"
                    placeholder="40000"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Shopping Limit</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    type="number"
                    value={shoppingLimit}
                    onChange={(e) => setShoppingLimit(e.target.value)}
                    className="pl-7 h-10 font-semibold"
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
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog
        open={addAccountOpen}
        onOpenChange={(open) => {
          if (!isAddingAcc) setAddAccountOpen(open);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Account</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new financial account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {addAccError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">
                  {addAccError}
                </AlertDescription>
              </Alert>
            )}

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
                      value="investment"
                      className="text-xs font-medium"
                    >
                      Investment
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Initial Balance</Label>
              <Input
                type="number"
                step="any"
                value={addAccBalance}
                onChange={(e) => setAddAccBalance(e.target.value)}
                className="h-10 font-semibold"
                placeholder="0"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
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
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!isSavingAcc && !open) setEditingAccount(null);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Account</DialogTitle>
            <DialogDescription className="text-xs">
              Update financial account details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {editAccError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">
                  {editAccError}
                </AlertDescription>
              </Alert>
            )}

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
                      value="investment"
                      className="text-xs font-medium"
                    >
                      Investment
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Balance</Label>
              <Input
                type="number"
                step="any"
                value={editAccBalance}
                onChange={(e) => setEditAccBalance(e.target.value)}
                className="h-10 font-semibold"
                placeholder="0"
                required
              />
            </div>

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

          <DialogFooter className="flex-row justify-between items-center gap-2 sm:justify-between">
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
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={!!deletingAccount}
        onOpenChange={(open) => {
          if (!isDeletingAcc && !open) setDeletingAccount(null);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-bold">
                "{deletingAccount?.name}"
              </strong>
              ?
              <span className="block mt-1 text-destructive font-semibold">
                ⚠️ WARNING: All transactions and monthly bill templates linked
                to this account will be permanently deleted! This action cannot
                be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          {deleteAccError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">
                {deleteAccError}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 mt-2">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
