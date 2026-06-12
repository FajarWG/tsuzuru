"use client";

import { useState } from "react";
import { formatJPY, formatIDR } from "@/lib/format";
import { markTemplatePaidAction, updateTemplateAction } from "@/lib/actions/templates";
import {
  IconCheck,
  IconLoader,
  IconAlertCircle,
  IconSettings,
  IconCash,
  IconCalendarRepeat,
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

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIntervalMonths, setEditIntervalMonths] = useState("1");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Pay dialog state
  const [payingItem, setPayingItem] = useState<TemplateItem | null>(null);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccessId, setPaySuccessId] = useState<string | null>(null);

  // --- Edit dialog handlers ---
  const openEdit = (item: TemplateItem) => {
    setEditingItem(item);
    setEditAmount(String(item.amount));
    setEditAccountId(item.accountId);
    setEditIsActive(item.isActive);
    setEditIntervalMonths(String(item.intervalMonths));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setEditError("Please enter a valid amount");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await updateTemplateAction(editingItem.id, {
        amount: parsedAmount,
        accountId: editAccountId,
        isActive: editIsActive,
        intervalMonths: parseInt(editIntervalMonths),
      });

      if (res.success) {
        setItems((prev) =>
          prev.map((t) =>
            t.id === editingItem.id
              ? {
                  ...t,
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
        setEditError(res.error || "Failed to save");
      }
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- Mark as Paid handlers ---
  const openPay = (item: TemplateItem) => {
    setPayingItem(item);
    setPayError(null);
  };

  const closePay = () => {
    setPayingItem(null);
    setPayError(null);
  };

  const handleMarkPaid = async () => {
    if (!payingItem) return;
    setIsPayingId(payingItem.id);
    setPayError(null);

    try {
      const res = await markTemplatePaidAction(payingItem.id);
      if (res.success) {
        setPaySuccessId(payingItem.id);
        setTimeout(() => setPaySuccessId(null), 2500);
        closePay();
      } else {
        setPayError(res.error || "Failed to record payment");
      }
    } catch {
      setPayError("An unexpected error occurred");
    } finally {
      setIsPayingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6">
        No monthly templates configured.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {!hideHeader && (
        <>
          <h2 className="font-serif text-xl font-bold text-primary">Monthly Templates</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Recurring bills — tap "Mark as Paid" when you've paid them.
          </p>
        </>
      )}

      <div className="flex flex-col divide-y divide-border/40">
        {items.map((item) => {
          const linkedAccount = accounts.find((a) => a.id === item.accountId);
          const monthlyEquivalent =
            item.intervalMonths > 1 ? item.amount / item.intervalMonths : null;
          const isPaying = isPayingId === item.id;
          const justPaid = paySuccessId === item.id;

          return (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {item.name}
                  </span>
                  {!item.isActive && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      Inactive
                    </Badge>
                  )}
                  {item.intervalMonths > 1 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1">
                      <IconCalendarRepeat className="size-2.5" />
                      {INTERVAL_OPTIONS.find((o) => o.value === String(item.intervalMonths))?.label || `Every ${item.intervalMonths}mo`}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold font-sans text-foreground">
                    {item.currency === "JPY" ? formatJPY(item.amount) : formatIDR(item.amount)}
                  </span>
                  {monthlyEquivalent !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      ≈ {item.currency === "JPY" ? formatJPY(monthlyEquivalent) : formatIDR(monthlyEquivalent)}/mo
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {linkedAccount?.name || "Unknown account"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mark as Paid */}
                {item.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-8 px-2.5 text-xs gap-1.5",
                      justPaid && "border-primary/40 text-primary bg-primary/5"
                    )}
                    onClick={() => openPay(item)}
                    disabled={isPaying || justPaid}
                  >
                    {isPaying ? (
                      <IconLoader className="size-3.5 animate-spin" />
                    ) : justPaid ? (
                      <>
                        <IconCheck className="size-3.5" />
                        Paid!
                      </>
                    ) : (
                      <>
                        <IconCash className="size-3.5" />
                        Paid
                      </>
                    )}
                  </Button>
                )}

                {/* Edit */}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => openEdit(item)}
                  aria-label={`Edit ${item.name}`}
                >
                  <IconSettings className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Edit Dialog ===== */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Template</DialogTitle>
            <DialogDescription className="text-xs">
              {editingItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {editError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{editError}</AlertDescription>
              </Alert>
            )}

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
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-8 h-10 text-sm font-semibold"
                  placeholder="0"
                  min="0"
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

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeEdit} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="min-w-[72px]">
              {isSavingEdit ? <IconLoader className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Mark as Paid Confirm Dialog ===== */}
      <Dialog open={!!payingItem} onOpenChange={(open) => !open && closePay()}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Mark as Paid</DialogTitle>
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
                This will deduct the full amount from the linked account and record it in history.
              </span>
            </DialogDescription>
          </DialogHeader>

          {payError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{payError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closePay} disabled={!!isPayingId}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMarkPaid}
              disabled={!!isPayingId}
              className="min-w-[100px]"
            >
              {isPayingId ? (
                <IconLoader className="size-4 animate-spin" />
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
