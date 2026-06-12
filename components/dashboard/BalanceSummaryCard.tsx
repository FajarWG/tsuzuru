"use client";

import { useState } from "react";
import { formatJPY, formatIDR } from "@/lib/format";
import { updateAccountBalanceWithHistoryAction, updateAccountNameAction } from "@/lib/actions/accounts";
import { toast } from "sonner";
import {
  IconBuildingBank,
  IconCreditCard,
  IconActivity,
  IconSettings,
  IconChevronDown,
  IconChevronUp,
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
}

interface BalanceSummaryCardProps {
  accounts: Account[];
  totalJPY: number;
  totalIDR: number;
}

function AccountTypeIcon({ type }: { type: string }) {
  if (type === "investment") return <IconActivity className="size-4" />;
  if (type === "ewallet") return <IconCreditCard className="size-4" />;
  return <IconBuildingBank className="size-4" />;
}

export default function BalanceSummaryCard({
  accounts,
  totalJPY,
  totalIDR,
}: BalanceSummaryCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts);

  // Edit dialog state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editReason, setEditReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openEdit = (acc: Account) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditBalance(String(acc.balance));
    setEditIsActive(acc.isActive);
    setEditReason("");
    setSaveError(null);
    setSaveSuccess(false);
  };

  const closeEdit = () => {
    setEditingAccount(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingAccount) return;
    const newBalance = parseFloat(editBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      setSaveError("Please enter a valid balance amount");
      return;
    }
    if (!editName.trim()) {
      setSaveError("Account name cannot be empty");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const balanceChanged = newBalance !== editingAccount.balance;
      const nameChanged = editName.trim() !== editingAccount.name || editIsActive !== editingAccount.isActive;

      // If balance changed, record history + update balance
      if (balanceChanged) {
        const res = await updateAccountBalanceWithHistoryAction(
          editingAccount.id,
          newBalance,
          editReason || undefined
        );
        if (!res.success) {
          setSaveError(res.error || "Failed to update balance");
          setIsSaving(false);
          return;
        }
      }

      // If name/active changed, update those separately
      if (nameChanged) {
        const res = await updateAccountNameAction(editingAccount.id, editName, editIsActive);
        if (!res.success) {
          setSaveError(res.error || "Failed to update account");
          setIsSaving(false);
          return;
        }
      }

      // Update local state
      setLocalAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? { ...a, name: editName.trim(), balance: newBalance, isActive: editIsActive }
            : a
        )
      );
      toast.success("Account updated successfully");
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        closeEdit();
      }, 1000);
    } catch {
      setSaveError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const activeAccounts = localAccounts.filter((a) => a.isActive);

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Total Balance
          </h2>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? (
              <>
                Hide <IconChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Show accounts <IconChevronDown className="size-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 divide-x divide-border/40">
          <div>
            <p className="text-[10px] text-muted-foreground tracking-wide font-medium">JPY Balance</p>
            <p className="text-2xl font-sans font-bold tracking-tight text-foreground mt-1">
              {formatJPY(totalJPY)}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] text-muted-foreground tracking-wide font-medium">IDR Balance</p>
            <p className="text-xl font-sans font-bold tracking-tight text-foreground mt-1.5">
              {formatIDR(totalIDR)}
            </p>
          </div>
        </div>

        {/* Collapsible account list */}
        {showDetails && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-border/30">
            {activeAccounts.map((acc) => (
              <div key={acc.id} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-muted text-primary/80">
                    <AccountTypeIcon type={acc.type} />
                  </span>
                  <span className="font-medium text-foreground">{acc.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-muted-foreground">
                    {acc.currency === "JPY" ? formatJPY(acc.balance) : formatIDR(acc.balance)}
                  </span>
                  <button
                    onClick={() => openEdit(acc)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Edit ${acc.name}`}
                  >
                    <IconSettings className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Account</DialogTitle>
            <DialogDescription className="text-xs">
              Changes to the balance are recorded in transaction history.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {saveError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{saveError}</AlertDescription>
              </Alert>
            )}

            {/* Account name */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Account Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 text-sm"
                placeholder="Account name"
              />
            </div>

            {/* New balance */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">
                New Balance ({editingAccount?.currency})
                {editingAccount && parseFloat(editBalance) !== editingAccount.balance && (
                  <span className={cn(
                    "ml-2 text-[10px] font-medium",
                    parseFloat(editBalance) > editingAccount.balance ? "text-primary" : "text-destructive"
                  )}>
                    {parseFloat(editBalance) > editingAccount.balance ? "+" : ""}
                    {editingAccount.currency === "JPY"
                      ? formatJPY(parseFloat(editBalance) - editingAccount.balance)
                      : formatIDR(parseFloat(editBalance) - editingAccount.balance)}
                  </span>
                )}
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold text-muted-foreground select-none">
                  {editingAccount?.currency === "JPY" ? "¥" : "Rp"}
                </span>
                <Input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="pl-8 h-10 text-sm font-semibold"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">
                Reason{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="h-10 text-sm"
                placeholder="e.g. Salary received, ATM top-up"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-xs font-semibold">Account Active</Label>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="min-w-[80px]">
              {isSaving ? (
                <IconLoader className="size-4 animate-spin" />
              ) : saveSuccess ? (
                <>
                  <IconCheck className="size-4" />
                  Saved!
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
