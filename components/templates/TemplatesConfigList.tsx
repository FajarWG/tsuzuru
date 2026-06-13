"use client";

import { useState } from "react";
import { formatJPY, formatIDR, formatInputAmount, parseInputAmount } from "@/lib/format";
import {
  markTemplatePaidAction,
  updateTemplateAction,
  createTemplateAction,
  deleteTemplateAction,
} from "@/lib/actions/templates";
import { toast } from "sonner";
import {
  IconCheck,
  IconLoader,
  IconSettings,
  IconCash,
  IconCalendarRepeat,
  IconTrash,
  IconPlus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TemplateItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
  isActive: boolean;
  intervalMonths: number;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
}

interface TemplatesConfigListProps {
  templates: TemplateItem[];
  accounts: AccountItem[];
  hideHeader?: boolean;
}

const INTERVAL_OPTIONS = [
  { value: "1", label: "Every month" },
  { value: "2", label: "Every 2 months" },
  { value: "3", label: "Every 3 months (quarterly)" },
  { value: "4", label: "Every 4 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every 12 months (yearly)" },
];

export default function TemplatesConfigList({
  templates,
  accounts,
  hideHeader = false,
}: TemplatesConfigListProps) {
  const [items, setItems] = useState<TemplateItem[]>(templates);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createAccountId, setCreateAccountId] = useState(accounts[0]?.id || "");
  const [createIntervalMonths, setCreateIntervalMonths] = useState("1");
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIntervalMonths, setEditIntervalMonths] = useState("1");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete dialog state
  const [deletingItem, setDeletingItem] = useState<TemplateItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pay dialog state
  const [payingItem, setPayingItem] = useState<TemplateItem | null>(null);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);
  const [paySuccessId, setPaySuccessId] = useState<string | null>(null);
  const [paySourceAccountId, setPaySourceAccountId] = useState("");
  const [payoffAmount, setPayoffAmount] = useState("");

  // --- Create dialog handlers ---
  const handleCreateBill = async () => {
    if (!createName.trim()) {
      toast.error("Please enter a bill name");
      return;
    }
    const parsedAmount = parseInputAmount(createAmount);
    if (!createAmount || parsedAmount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!createAccountId) {
      toast.error("Please select a linked account");
      return;
    }

    setIsCreating(true);

    try {
      const res = await createTemplateAction({
        name: createName.trim(),
        amount: parsedAmount,
        accountId: createAccountId,
        intervalMonths: parseInt(createIntervalMonths),
      });

      if (res.success && res.template) {
        toast.success("Bill created successfully");
        setItems((prev) =>
          [...prev, res.template as TemplateItem].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
        setCreateOpen(false);
        setCreateName("");
        setCreateAmount("");
        setCreateIntervalMonths("1");
      } else {
        toast.error(res.error || "Failed to create bill");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Edit dialog handlers ---
  const openEdit = (item: TemplateItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditAmount(formatInputAmount(item.amount));
    setEditAccountId(item.accountId);
    setEditIsActive(item.isActive);
    setEditIntervalMonths(String(item.intervalMonths));
  };

  const closeEdit = () => {
    setEditingItem(null);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editName.trim()) {
      toast.error("Please enter a bill name");
      return;
    }
    const parsedAmount = parseInputAmount(editAmount);
    if (!editAmount || parsedAmount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSavingEdit(true);

    try {
      const res = await updateTemplateAction(editingItem.id, {
        name: editName.trim(),
        amount: parsedAmount,
        accountId: editAccountId,
        isActive: editIsActive,
        intervalMonths: parseInt(editIntervalMonths),
      });

      if (res.success) {
        toast.success("Bill updated successfully");
        setItems((prev) =>
          prev.map((t) =>
            t.id === editingItem.id
              ? {
                  ...t,
                  name: editName.trim(),
                  amount: parsedAmount,
                  accountId: editAccountId,
                  isActive: editIsActive,
                  intervalMonths: parseInt(editIntervalMonths),
                }
              : t
          )
        );
        closeEdit();
      } else {
        toast.error(res.error || "Failed to save");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- Delete dialog handlers ---
  const openDelete = (item: TemplateItem) => {
    setDeletingItem(item);
  };

  const handleDeleteBill = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      const res = await deleteTemplateAction(deletingItem.id);
      if (res.success) {
        toast.success("Bill deleted successfully");
        setItems((prev) => prev.filter((t) => t.id !== deletingItem.id));
        setDeletingItem(null);
      } else {
        toast.error(res.error || "Failed to delete bill");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Mark as Paid handlers ---
  const openPay = (item: TemplateItem) => {
    setPayingItem(item);
    const isCc = 'isCreditCardBill' in item && (item as any).isCreditCardBill;
    if (isCc) {
      const defAcc = accounts.find(
        (a) => a.currency === item.currency && a.type !== "credit_card" && a.isActive
      );
      setPaySourceAccountId(defAcc?.id || "");
      setPayoffAmount(formatInputAmount(item.amount));
    } else {
      setPaySourceAccountId("");
      setPayoffAmount("");
    }
  };

  const closePay = () => {
    setPayingItem(null);
    setPaySourceAccountId("");
    setPayoffAmount("");
  };

  const handleMarkPaid = async () => {
    if (!payingItem) return;

    const isCc = 'isCreditCardBill' in payingItem && (payingItem as any).isCreditCardBill;
    const customAmount = isCc ? parseInputAmount(payoffAmount) : undefined;

    if (isCc && (isNaN(customAmount!) || customAmount! <= 0)) {
      toast.error("Please enter a valid payoff amount");
      return;
    }

    setIsPayingId(payingItem.id);

    try {
      const res = await markTemplatePaidAction(payingItem.id, paySourceAccountId || undefined, customAmount);
      if (res.success) {
        toast.success("Bill marked as paid");
        setPaySuccessId(payingItem.id);
        setTimeout(() => setPaySuccessId(null), 2500);
        window.dispatchEvent(new CustomEvent("transaction-added"));
        closePay();
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPayingId(null);
    }
  };

  // Note: We don't return early if items.length === 0, because we want to allow users to add new bills!
  
  return (
    <div className="flex flex-col gap-1">
      {!hideHeader && (
        <div className="flex justify-between items-center pb-2 border-b border-border/20 mb-4">
          <div className="flex items-center gap-2">
            <IconCalendarRepeat className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Recurring Bills</h2>
          </div>
          <Button
            onClick={() => {
              setCreateName("");
              setCreateAmount("");
              setCreateAccountId(accounts[0]?.id || "");
              setCreateIntervalMonths("1");
              setCreateOpen(true);
            }}
            size="sm"
            variant="outline"
            className="gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold cursor-pointer"
          >
            <IconPlus className="size-3" />
            Add Bill
          </Button>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border/40">
        {(() => {
          // Generate Credit Card bills dynamically from accounts with debt (balance < 0)
          const ccBills = accounts
            .filter((acc) => acc.type === "credit_card" && acc.isActive && acc.balance < 0)
            .map((acc) => ({
              id: `cc-bill-${acc.id}`,
              name: `Credit Card Bill: ${acc.name}`,
              amount: Math.abs(acc.balance),
              currency: acc.currency,
              accountId: "", // Will be selected at payment time
              isActive: true,
              intervalMonths: 1,
              isCreditCardBill: true,
              creditCardAccountId: acc.id,
            }));

          const allBills = [...items, ...ccBills];

          if (allBills.length === 0) {
            return (
              <div className="text-center text-xs text-muted-foreground py-6">
                No recurring bills configured. Click &quot;Add Bill&quot; to create one.
              </div>
            );
          }

          return allBills.map((item) => {
            const isCreditCardBill = 'isCreditCardBill' in item && (item as any).isCreditCardBill;
            const linkedAccount = accounts.find((a) => a.id === item.accountId);
            const monthlyEquivalent =
              item.intervalMonths > 1 ? item.amount / item.intervalMonths : null;
            const isPaying = isPayingId === item.id;
            const justPaid = paySuccessId === item.id;

            // Find default source account for credit card bill
            const defaultSourceAccount = isCreditCardBill
              ? accounts.find(
                  (a) => a.currency === item.currency && a.type !== "credit_card" && a.isActive
                )
              : null;

            return (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.name}
                    </span>
                    {!item.isActive && (
                      <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-normal">
                        Inactive
                      </Badge>
                    )}
                    {item.intervalMonths > 1 && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5 font-normal">
                        <IconCalendarRepeat className="size-2" />
                        {INTERVAL_OPTIONS.find((o) => o.value === String(item.intervalMonths))?.label.replace("Every ", "") || `${item.intervalMonths}mo`}
                      </Badge>
                    )}
                    {isCreditCardBill && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none font-semibold">
                        Auto-generated
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {isCreditCardBill
                      ? `Pay from: ${defaultSourceAccount?.name || "select when paying"}`
                      : (linkedAccount?.name || "Unknown account")}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end min-w-0 select-none">
                    <span className="text-xs font-bold font-sans text-foreground">
                      {item.currency === "JPY" ? formatJPY(item.amount) : formatIDR(item.amount)}
                    </span>
                    {monthlyEquivalent !== null && (
                      <span className="text-[9px] text-muted-foreground">
                        ≈ {item.currency === "JPY" ? formatJPY(monthlyEquivalent) : formatIDR(monthlyEquivalent)}/mo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {item.isActive && (
                      <Button
                        size="xs"
                        variant="outline"
                        className={cn(
                          "gap-1 cursor-pointer font-semibold",
                          justPaid && "border-primary/40 text-primary bg-primary/5"
                        )}
                        onClick={() => openPay(item)}
                        disabled={isPaying || justPaid}
                      >
                        {isPaying ? (
                          <IconLoader className="size-3 animate-spin" />
                        ) : justPaid ? (
                          <>
                            <IconCheck className="size-3" />
                            Paid!
                          </>
                        ) : (
                          <>
                            <IconCash className="size-3" />
                            Paid
                          </>
                        )}
                      </Button>
                    )}

                    {!isCreditCardBill && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEdit(item)}
                        aria-label={`Edit ${item.name}`}
                        className="cursor-pointer"
                      >
                        <IconSettings className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* ===== Create Dialog ===== */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Create Recurring Bill</DialogTitle>
              <DialogDescription className="text-xs">
                Add a recurring bill like rent or utilities.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              {/* Bill Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Bill Name</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="h-10"
                  placeholder="e.g. Apato, Electricity, Gas"
                />
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Amount</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(formatInputAmount(e.target.value))}
                  className="h-10 font-semibold"
                  placeholder="0"
                />
              </div>

              {/* Interval */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Billing Frequency</Label>
                <Select value={createIntervalMonths} onValueChange={setCreateIntervalMonths}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-sm">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Deduct From Account</Label>
                <Select value={createAccountId} onValueChange={setCreateAccountId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-sm">
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isCreating} className="cursor-pointer">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateBill} disabled={isCreating} className="min-w-[72px] cursor-pointer">
                {isCreating ? <IconLoader className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Edit Bill</DialogTitle>
              <DialogDescription className="text-xs">
                {editingItem?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              {/* Bill Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Bill Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10"
                  placeholder="e.g. Apato, Gas, Electric"
                />
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Amount ({editingItem?.currency})
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-muted-foreground select-none">
                    {editingItem?.currency === "JPY" ? "¥" : "Rp"}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={editAmount}
                    onChange={(e) => setEditAmount(formatInputAmount(e.target.value))}
                    className="pl-8 h-10 font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Interval */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Billing Frequency</Label>
                <Select value={editIntervalMonths} onValueChange={setEditIntervalMonths}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-sm">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parseInt(editIntervalMonths) > 1 && parseFloat(editAmount) > 0 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    Monthly equivalent:{" "}
                    <span className="font-semibold text-foreground">
                      {editingItem?.currency === "JPY"
                        ? formatJPY(parseFloat(editAmount) / parseInt(editIntervalMonths))
                        : formatIDR(parseFloat(editAmount) / parseInt(editIntervalMonths))}
                      /mo
                    </span>
                  </p>
                )}
              </div>

              <Separator />

              {/* Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Deduct From Account</Label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-sm">
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs font-semibold">Active</Label>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 flex-row justify-between items-center gap-2 sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={() => {
                  if (editingItem) {
                    openDelete(editingItem);
                    closeEdit();
                  }
                }}
                disabled={isSavingEdit}
              >
                <IconTrash className="size-4 mr-1" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={closeEdit} disabled={isSavingEdit} className="cursor-pointer">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="min-w-[72px] cursor-pointer">
                  {isSavingEdit ? <IconLoader className="size-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm Dialog ===== */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Delete Recurring Bill</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Are you sure you want to delete the recurring bill for <strong>{deletingItem?.name}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  This template will be permanently removed. History of past paid transactions will not be deleted.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingItem(null)} disabled={isDeleting} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteBill}
                disabled={isDeleting}
                className="min-w-[80px] cursor-pointer"
              >
                {isDeleting ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Mark as Paid Confirm Dialog ===== */}
      <Dialog open={!!payingItem} onOpenChange={(open) => !open && closePay()}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Mark as Paid</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Record payment of{" "}
                <strong>
                  {payingItem?.currency === "JPY"
                    ? formatJPY(payingItem?.amount ?? 0)
                    : formatIDR(payingItem?.amount ?? 0)}
                </strong>{" "}
                for <strong>{payingItem?.name}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  {payingItem && 'isCreditCardBill' in payingItem && (payingItem as any).isCreditCardBill
                    ? "This will pay off the credit card and record a dual-entry transfer transaction."
                    : "This will deduct the full amount from the linked account and record it in history."}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
              {payingItem && 'isCreditCardBill' in payingItem && (payingItem as any).isCreditCardBill && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Payoff Amount</Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                        {payingItem.currency === "JPY" ? "¥" : "Rp"}
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={payoffAmount}
                        onChange={(e) => setPayoffAmount(formatInputAmount(e.target.value))}
                        className={cn(
                          payingItem.currency === "JPY" ? "pl-7" : "pl-9",
                          "h-10 font-semibold text-sm"
                        )}
                        placeholder="e.g. 500,000"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-normal">
                      Default is the current outstanding balance. You can enter a custom payoff amount (e.g. last month's statement balance).
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Deduct payment from account</Label>
                    <Select value={paySourceAccountId} onValueChange={setPaySourceAccountId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((acc) => acc.currency === payingItem.currency && acc.type !== "credit_card" && acc.isActive)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.name} ({acc.currency === "JPY" ? formatJPY(acc.balance) : formatIDR(acc.balance)})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button variant="outline" size="sm" onClick={closePay} disabled={!!isPayingId} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMarkPaid}
                disabled={!!isPayingId || (payingItem && 'isCreditCardBill' in payingItem && (payingItem as any).isCreditCardBill && (!paySourceAccountId || !payoffAmount))}
                className="min-w-[100px] cursor-pointer"
              >
                {isPayingId ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
