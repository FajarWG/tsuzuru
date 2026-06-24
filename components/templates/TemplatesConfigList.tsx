"use client";

import { useState, useMemo } from "react";
import {
  formatJPY,
  formatIDR,
  formatInputAmount,
  parseInputAmount,
} from "@/lib/format";
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
  paymentMode: "self_paid" | "split_with_friends";
  splitConfig?: {
    friends: { personName: string; percentage: number }[];
  } | null;
}

interface CreditCardBillItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
  isActive: boolean;
  intervalMonths: number;
  isCreditCardBill: true;
  creditCardAccountId: string;
}

type BillListItem = TemplateItem | CreditCardBillItem;

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  isActive: boolean;
  defaultPaymentAccountId?: string | null;
}

interface TemplatesConfigListProps {
  templates: TemplateItem[];
  accounts: AccountItem[];
  hideHeader?: boolean;
  paidTemplateNamesThisMonth?: string[];
  friendNames?: string[];
}

const INTERVAL_OPTIONS = [
  { value: "1", label: "Every month" },
  { value: "2", label: "Every 2 months" },
  { value: "3", label: "Every 3 months (quarterly)" },
  { value: "4", label: "Every 4 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every 12 months (yearly)" },
];

const EMPTY_SPLIT_FRIEND = {
  personName: "",
  percentage: "",
};

function parseSplitPercentage(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateSplitFriends(
  friends: { personName: string; percentage: string }[],
) {
  const normalized = friends
    .map((friend) => ({
      personName: friend.personName.trim(),
      percentage: parseSplitPercentage(friend.percentage),
    }))
    .filter(
      (friend) => friend.personName.length > 0 || !Number.isNaN(friend.percentage),
    );

  if (normalized.length === 0) {
    return { error: "Add at least one friend for split bills" };
  }

  if (normalized.some((friend) => !friend.personName)) {
    return { error: "Every split friend needs a name" };
  }

  if (
    normalized.some(
      (friend) => Number.isNaN(friend.percentage) || friend.percentage <= 0,
    )
  ) {
    return { error: "Every split friend needs a valid percentage" };
  }

  const totalPercentage = normalized.reduce(
    (sum, friend) => sum + friend.percentage,
    0,
  );
  if (totalPercentage >= 100) {
    return { error: "Total friend percentage must stay below 100%" };
  }

  const names = normalized.map((friend) => friend.personName.toLowerCase());
  if (new Set(names).size !== names.length) {
    return { error: "Friend names must be unique" };
  }

  return {
    value: normalized,
    totalPercentage,
  };
}

export default function TemplatesConfigList({
  templates,
  accounts,
  hideHeader = false,
  paidTemplateNamesThisMonth = [],
  friendNames = [],
}: TemplatesConfigListProps) {
  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createAccountId, setCreateAccountId] = useState(accounts[0]?.id || "");
  const [createIntervalMonths, setCreateIntervalMonths] = useState("1");
  const [createPaymentMode, setCreatePaymentMode] = useState<"self_paid" | "split_with_friends">("self_paid");
  const [createSplitFriends, setCreateSplitFriends] = useState([EMPTY_SPLIT_FRIEND]);
  const [isCreating, setIsCreating] = useState(false);

  // Autocomplete suggestion states for split bill friends
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedFriendIndex, setFocusedFriendIndex] = useState<number | null>(null);
  const [focusedFriendType, setFocusedFriendType] = useState<"create" | "edit" | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIntervalMonths, setEditIntervalMonths] = useState("1");
  const [editPaymentMode, setEditPaymentMode] = useState<"self_paid" | "split_with_friends">("self_paid");
  const [editSplitFriends, setEditSplitFriends] = useState([EMPTY_SPLIT_FRIEND]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete dialog state
  const [deletingItem, setDeletingItem] = useState<TemplateItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pay dialog state
  const [payingItem, setPayingItem] = useState<BillListItem | null>(null);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);
  const [paySuccessId, setPaySuccessId] = useState<string | null>(null);
  const [paySourceAccountId, setPaySourceAccountId] = useState("");
  const [payoffAmount, setPayoffAmount] = useState("");
  const isPayingItemCc = !!(
    payingItem &&
    "isCreditCardBill" in payingItem &&
    payingItem.isCreditCardBill
  );

  // Autocomplete suggestion helpers
  const filteredSuggestions = useMemo(() => {
    if (focusedFriendIndex === null || focusedFriendType === null) return [];
    const currentInputName =
      focusedFriendType === "create"
        ? createSplitFriends[focusedFriendIndex]?.personName || ""
        : editSplitFriends[focusedFriendIndex]?.personName || "";

    return friendNames.filter((name) =>
      name.toLowerCase().includes(currentInputName.toLowerCase())
    );
  }, [friendNames, focusedFriendIndex, focusedFriendType, createSplitFriends, editSplitFriends]);

  const selectSuggestion = (name: string) => {
    if (focusedFriendIndex === null || focusedFriendType === null) return;
    if (focusedFriendType === "create") {
      setCreateSplitFriends((prev) =>
        prev.map((item, idx) =>
          idx === focusedFriendIndex ? { ...item, personName: name } : item
        )
      );
    } else {
      setEditSplitFriends((prev) =>
        prev.map((item, idx) =>
          idx === focusedFriendIndex ? { ...item, personName: name } : item
        )
      );
    }
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
        setShowSuggestions(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      setActiveIndex((prev) => (prev + 1 < filteredSuggestions.length ? prev + 1 : prev));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        const name = filteredSuggestions[activeIndex];
        selectSuggestion(name);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      e.preventDefault();
    }
  };

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

    const splitValidation =
      createPaymentMode === "split_with_friends"
        ? validateSplitFriends(createSplitFriends)
        : null;
    if (splitValidation && !splitValidation.value) {
      toast.error(splitValidation.error || "Invalid split configuration");
      return;
    }

    setIsCreating(true);

    try {
      const res = await createTemplateAction({
        name: createName.trim(),
        amount: parsedAmount,
        accountId: createAccountId,
        intervalMonths: parseInt(createIntervalMonths),
        paymentMode: createPaymentMode,
        splitConfig:
          createPaymentMode === "split_with_friends" && splitValidation?.value
            ? { friends: splitValidation.value }
            : null,
      });

      if (res.success && res.template) {
        toast.success("Bill created successfully");
        setCreateOpen(false);
        setCreateName("");
        setCreateAmount("");
        setCreateIntervalMonths("1");
        setCreatePaymentMode("self_paid");
        setCreateSplitFriends([EMPTY_SPLIT_FRIEND]);
        window.dispatchEvent(new CustomEvent("bill-updated"));
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
    setEditPaymentMode(item.paymentMode || "self_paid");
    setEditSplitFriends(
      item.paymentMode === "split_with_friends" && item.splitConfig?.friends?.length
        ? item.splitConfig.friends.map((friend) => ({
            personName: friend.personName,
            percentage: String(friend.percentage),
          }))
        : [EMPTY_SPLIT_FRIEND],
    );
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditPaymentMode("self_paid");
    setEditSplitFriends([EMPTY_SPLIT_FRIEND]);
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

    const splitValidation =
      editPaymentMode === "split_with_friends"
        ? validateSplitFriends(editSplitFriends)
        : null;
    if (splitValidation && !splitValidation.value) {
      toast.error(splitValidation.error || "Invalid split configuration");
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
        paymentMode: editPaymentMode,
        splitConfig:
          editPaymentMode === "split_with_friends" && splitValidation?.value
            ? { friends: splitValidation.value }
            : null,
      });

      if (res.success) {
        toast.success("Bill updated successfully");
        window.dispatchEvent(new CustomEvent("bill-updated"));
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
        setDeletingItem(null);
        window.dispatchEvent(new CustomEvent("bill-updated"));
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
  const openPay = (item: BillListItem) => {
    setPayingItem(item);
    const isCc = "isCreditCardBill" in item && item.isCreditCardBill;
    if (isCc) {
      const ccAcc = accounts.find(
        (a) => a.id === item.creditCardAccountId,
      );
      const configuredDefaultId = ccAcc?.defaultPaymentAccountId;
      const defAcc =
        accounts.find((a) => a.id === configuredDefaultId) ||
        accounts.find(
          (a) =>
            a.currency === item.currency &&
            a.type !== "credit_card" &&
            a.isActive,
        );
      setPaySourceAccountId(defAcc?.id || "");
      setPayoffAmount(formatInputAmount(item.amount));
    } else {
      setPaySourceAccountId(item.accountId || "");
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

    const isCc =
      "isCreditCardBill" in payingItem && payingItem.isCreditCardBill;
    const customAmount = isCc ? parseInputAmount(payoffAmount) : undefined;

    if (isCc && (isNaN(customAmount!) || customAmount! <= 0)) {
      toast.error("Please enter a valid payoff amount");
      return;
    }

    setIsPayingId(payingItem.id);

    try {
      const res = await markTemplatePaidAction(
        payingItem.id,
        paySourceAccountId || undefined,
        customAmount,
      );
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
            <h2 className="text-sm font-bold text-foreground">
              Recurring Bills
            </h2>
          </div>
          <Button
            onClick={() => {
              setCreateName("");
              setCreateAmount("");
              setCreateAccountId(accounts[0]?.id || "");
              setCreateIntervalMonths("1");
              setCreatePaymentMode("self_paid");
              setCreateSplitFriends([EMPTY_SPLIT_FRIEND]);
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

      <div className="flex flex-col gap-1">
        {(() => {
          const isItemPaid = (item: BillListItem) => {
            if ("isCreditCardBill" in item && item.isCreditCardBill) {
              const cleanCcName = item.name.replace("Credit Card Bill: ", "");
              const ccPaidName = `CC Payoff: ${cleanCcName}`;
              return paidTemplateNamesThisMonth.some(name => name.includes(ccPaidName));
            }
            return paidTemplateNamesThisMonth.includes(item.name);
          };

          // Generate Credit Card bills dynamically from accounts with debt (balance < 0) or paid CC this month
          const ccBills = accounts
            .filter((acc) => {
              if (acc.type !== "credit_card" || !acc.isActive) return false;
              if (acc.balance < 0) return true;
              const ccPaidName = `CC Payoff: ${acc.name}`;
              return paidTemplateNamesThisMonth.some(name => name.includes(ccPaidName));
            })
            .map((acc) => ({
              id: `cc-bill-${acc.id}`,
              name: `Credit Card Bill: ${acc.name}`,
              amount: Math.abs(acc.balance),
              currency: acc.currency,
              accountId: "", // Will be selected at payment time
              isActive: true,
              intervalMonths: 1,
              isCreditCardBill: true as const,
              creditCardAccountId: acc.id,
            }));

          const allBills: BillListItem[] = [...ccBills, ...templates];

          if (allBills.length === 0) {
            return (
              <div className="text-center text-xs text-muted-foreground py-6">
                No recurring bills configured. Click &quot;Add Bill&quot; to
                create one.
              </div>
            );
          }

          const unpaidBills = allBills.filter((item) => !isItemPaid(item));
          const paidBills = allBills.filter((item) => isItemPaid(item));

          const renderBillRow = (item: BillListItem, isPaid: boolean) => {
            const isCreditCardBill =
              "isCreditCardBill" in item && item.isCreditCardBill;
            const linkedAccount = accounts.find((a) => a.id === item.accountId);
            const monthlyEquivalent =
              item.intervalMonths > 1
                ? item.amount / item.intervalMonths
                : null;
            const splitFriends =
              ("splitConfig" in item && item.splitConfig?.friends) || [];
            const splitTotal = splitFriends.reduce(
              (sum: number, friend: { personName: string; percentage: number }) =>
                sum + friend.percentage,
              0,
            );
            const isPaying = isPayingId === item.id;
            const justPaid = paySuccessId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "py-2 flex items-center justify-between gap-3 text-xs transition-opacity duration-200",
                  isCreditCardBill &&
                    "bg-rose-500/[0.03] dark:bg-rose-500/[0.015] px-1 [box-shadow:-3px_0_0_0_rgb(244_63_94_/_0.5)] my-1 first:mt-0 last:mb-0",
                  isPaid && "opacity-60"
                )}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                      "text-xs font-semibold text-foreground truncate",
                      isPaid && "text-muted-foreground line-through decoration-muted-foreground/30"
                    )}>
                      {item.name}
                    </span>
                    {!item.isActive && (
                      <Badge
                        variant="secondary"
                        className="text-[8px] h-3.5 px-1 font-normal"
                      >
                        Inactive
                      </Badge>
                    )}
                    {item.intervalMonths > 1 && (
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3.5 px-1 gap-0.5 font-normal"
                      >
                        <IconCalendarRepeat className="size-2" />
                        {INTERVAL_OPTIONS.find(
                          (o) => o.value === String(item.intervalMonths),
                        )?.label.replace("Every ", "") ||
                          `${item.intervalMonths}mo`}
                      </Badge>
                    )}
                    {"paymentMode" in item && item.paymentMode === "split_with_friends" && (
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3.5 px-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none font-semibold"
                      >
                        Split {splitFriends.length} friends
                      </Badge>
                    )}
                    {isCreditCardBill && (
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3.5 px-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none font-semibold"
                      >
                        Auto-generated (
                        {(() => {
                          const now = new Date();
                          const mm = String(now.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const yy = String(now.getFullYear()).slice(-2);
                          return `${mm}/${yy}`;
                        })()}
                        )
                      </Badge>
                    )}
                  </div>
                  {!isCreditCardBill && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {linkedAccount?.name || "Unknown account"}
                      </span>
                      {"paymentMode" in item && item.paymentMode === "split_with_friends" && splitFriends.length > 0 && (
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          {splitFriends.map((friend: { personName: string; percentage: number }) => `${friend.personName} ${friend.percentage}%`).join(" · ")} · You keep {Math.max(0, 100 - splitTotal)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end min-w-0 select-none">
                    <span className="text-xs font-bold font-sans text-foreground">
                      {item.currency === "JPY"
                        ? formatJPY(item.amount)
                        : formatIDR(item.amount)}
                    </span>
                    {monthlyEquivalent !== null && (
                      <span className="text-[9px] text-muted-foreground">
                        ≈{" "}
                        {item.currency === "JPY"
                          ? formatJPY(monthlyEquivalent)
                          : formatIDR(monthlyEquivalent)}
                        /mo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {item.isActive && (
                      <>
                        {isPaid || justPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded-lg select-none">
                            <IconCheck className="size-3.5 stroke-[3]" />
                            Paid
                          </span>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            className={cn(
                              "gap-1 cursor-pointer font-semibold",
                              justPaid &&
                                "border-primary/40 text-primary bg-primary/5",
                            )}
                            onClick={() => openPay(item)}
                            disabled={isPaying}
                          >
                            {isPaying ? (
                              <IconLoader className="size-3 animate-spin" />
                            ) : (
                              <>
                                <IconCash className="size-3" />
                                Paid
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {!isCreditCardBill && !isPaid && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => openEdit(item as TemplateItem)}
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
          };

          return (
            <div className="flex flex-col gap-1">
              {/* Unpaid section */}
              {unpaidBills.length > 0 && (
                <div className="flex flex-col divide-y divide-border/40">
                  {unpaidBills.map((item) => renderBillRow(item, false))}
                </div>
              )}

              {/* Paid section */}
              {paidBills.length > 0 && (
                <div className="mt-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 px-1 py-1 border-b border-border/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Paid
                    </span>
                  </div>
                  <div className="flex flex-col divide-y divide-border/40">
                    {paidBills.map((item) => renderBillRow(item, true))}
                  </div>
                </div>
              )}

              {unpaidBills.length === 0 && paidBills.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No recurring bills configured. Click &quot;Add Bill&quot; to
                  create one.
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ===== Create Dialog ===== */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => !open && setCreateOpen(false)}
      >
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">
                Create Recurring Bill
              </DialogTitle>
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
                  onChange={(e) =>
                    setCreateAmount(formatInputAmount(e.target.value))
                  }
                  className="h-10 font-semibold"
                  placeholder="0"
                />
              </div>

              {/* Interval */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Billing Frequency
                </Label>
                <Select
                  value={createIntervalMonths}
                  onValueChange={setCreateIntervalMonths}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-sm"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Deduct From Account
                </Label>
                <Select
                  value={createAccountId}
                  onValueChange={setCreateAccountId}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        className="text-sm"
                      >
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Payment Handling</Label>
                <Select
                  value={createPaymentMode}
                  onValueChange={(value: "self_paid" | "split_with_friends") =>
                    setCreatePaymentMode(value)
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self_paid" className="text-sm">
                      I pay this bill myself
                    </SelectItem>
                    <SelectItem value="split_with_friends" className="text-sm">
                      Split with bill friends
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createPaymentMode === "split_with_friends" && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Label className="text-xs font-semibold">Default Split Friends</Label>
                      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                        When this bill is paid, Tsuzuru will auto-create Bill Friends entries for these people.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px] cursor-pointer"
                      onClick={() =>
                        setCreateSplitFriends((prev) => [
                          ...prev,
                          { ...EMPTY_SPLIT_FRIEND },
                        ])
                      }
                    >
                      <IconPlus className="size-3" /> Add
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {createSplitFriends.map((friend, index) => (
                      <div key={`create-friend-${index}`} className="grid grid-cols-[1fr_112px_32px] gap-2 items-center relative">
                        <div className="relative flex flex-col">
                          <Input
                            value={friend.personName}
                            onChange={(e) => {
                              setCreateSplitFriends((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, personName: e.target.value }
                                    : item,
                                ),
                              );
                              setFocusedFriendIndex(index);
                              setFocusedFriendType("create");
                              setShowSuggestions(true);
                              setActiveIndex(-1);
                            }}
                            onFocus={() => {
                              setFocusedFriendIndex(index);
                              setFocusedFriendType("create");
                              setShowSuggestions(true);
                              setActiveIndex(-1);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(false);
                                setFocusedFriendIndex(null);
                                setFocusedFriendType(null);
                                setActiveIndex(-1);
                              }, 150);
                            }}
                            onKeyDown={handleKeyDown}
                            className="h-9 text-xs"
                            placeholder="Friend name"
                            autoComplete="off"
                          />
                          {showSuggestions &&
                            focusedFriendType === "create" &&
                            focusedFriendIndex === index &&
                            filteredSuggestions.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 top-[38px] max-h-48 overflow-y-auto rounded-2xl border border-border/40 bg-white dark:bg-zinc-900 p-1.5 shadow-lg animate-in fade-in-50 slide-in-from-top-1 duration-150">
                                <div className="flex flex-col gap-0.5">
                                  {filteredSuggestions.map((name, idx) => (
                                    <button
                                      key={name}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(name);
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                                        idx === activeIndex
                                          ? "bg-primary text-primary-foreground"
                                          : "hover:bg-muted/80 text-foreground"
                                      )}
                                    >
                                      {name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                        <div className="relative flex items-center">
                          <Input
                            value={friend.percentage}
                            onChange={(e) =>
                              setCreateSplitFriends((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        percentage: e.target.value.replace(/[^0-9.]/g, ""),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="h-9 pr-6 text-xs"
                            placeholder="25"
                          />
                          <span className="absolute right-3 text-[10px] text-muted-foreground">%</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:bg-destructive/10 cursor-pointer"
                          disabled={createSplitFriends.length === 1}
                          onClick={() =>
                            setCreateSplitFriends((prev) =>
                              prev.length === 1
                                ? prev
                                : prev.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Alert className="border-amber-500/20 bg-amber-500/5">
                    <AlertDescription className="text-[10px] leading-relaxed">
                      Friend percentages must stay below 100% so part of the recurring bill remains your own share.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateBill}
                disabled={isCreating}
                className="min-w-[72px] cursor-pointer"
              >
                {isCreating ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Dialog ===== */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && closeEdit()}
      >
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
                    onChange={(e) =>
                      setEditAmount(formatInputAmount(e.target.value))
                    }
                    className="pl-8 h-10 font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Interval */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Billing Frequency
                </Label>
                <Select
                  value={editIntervalMonths}
                  onValueChange={setEditIntervalMonths}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-sm"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parseInt(editIntervalMonths) > 1 &&
                  parseFloat(editAmount) > 0 && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      Monthly equivalent:{" "}
                      <span className="font-semibold text-foreground">
                        {editingItem?.currency === "JPY"
                          ? formatJPY(
                              parseFloat(editAmount) /
                                parseInt(editIntervalMonths),
                            )
                          : formatIDR(
                              parseFloat(editAmount) /
                                parseInt(editIntervalMonths),
                            )}
                        /mo
                      </span>
                    </p>
                  )}
              </div>

              <Separator />

              {/* Account */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Deduct From Account
                </Label>
                <Select value={editAccountId} onValueChange={setEditAccountId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        className="text-sm"
                      >
                        {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Payment Handling</Label>
                <Select
                  value={editPaymentMode}
                  onValueChange={(value: "self_paid" | "split_with_friends") =>
                    setEditPaymentMode(value)
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self_paid" className="text-sm">
                      I pay this bill myself
                    </SelectItem>
                    <SelectItem value="split_with_friends" className="text-sm">
                      Split with bill friends
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editPaymentMode === "split_with_friends" && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Label className="text-xs font-semibold">Default Split Friends</Label>
                      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                        Marking this bill as paid will auto-create Bill Friends entries with these percentages.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px] cursor-pointer"
                      onClick={() =>
                        setEditSplitFriends((prev) => [
                          ...prev,
                          { ...EMPTY_SPLIT_FRIEND },
                        ])
                      }
                    >
                      <IconPlus className="size-3" /> Add
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {editSplitFriends.map((friend, index) => (
                      <div key={`edit-friend-${index}`} className="grid grid-cols-[1fr_112px_32px] gap-2 items-center relative">
                        <div className="relative flex flex-col">
                          <Input
                            value={friend.personName}
                            onChange={(e) => {
                              setEditSplitFriends((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, personName: e.target.value }
                                    : item,
                                ),
                              );
                              setFocusedFriendIndex(index);
                              setFocusedFriendType("edit");
                              setShowSuggestions(true);
                              setActiveIndex(-1);
                            }}
                            onFocus={() => {
                              setFocusedFriendIndex(index);
                              setFocusedFriendType("edit");
                              setShowSuggestions(true);
                              setActiveIndex(-1);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(false);
                                setFocusedFriendIndex(null);
                                setFocusedFriendType(null);
                                setActiveIndex(-1);
                              }, 150);
                            }}
                            onKeyDown={handleKeyDown}
                            className="h-9 text-xs"
                            placeholder="Friend name"
                            autoComplete="off"
                          />
                          {showSuggestions &&
                            focusedFriendType === "edit" &&
                            focusedFriendIndex === index &&
                            filteredSuggestions.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 top-[38px] max-h-48 overflow-y-auto rounded-2xl border border-border/40 bg-white dark:bg-zinc-900 p-1.5 shadow-lg animate-in fade-in-50 slide-in-from-top-1 duration-150">
                                <div className="flex flex-col gap-0.5">
                                  {filteredSuggestions.map((name, idx) => (
                                    <button
                                      key={name}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(name);
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                                        idx === activeIndex
                                          ? "bg-primary text-primary-foreground"
                                          : "hover:bg-muted/80 text-foreground"
                                      )}
                                    >
                                      {name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                        <div className="relative flex items-center">
                          <Input
                            value={friend.percentage}
                            onChange={(e) =>
                              setEditSplitFriends((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        percentage: e.target.value.replace(/[^0-9.]/g, ""),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="h-9 pr-6 text-xs"
                            placeholder="25"
                          />
                          <span className="absolute right-3 text-[10px] text-muted-foreground">%</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:bg-destructive/10 cursor-pointer"
                          disabled={editSplitFriends.length === 1}
                          onClick={() =>
                            setEditSplitFriends((prev) =>
                              prev.length === 1
                                ? prev
                                : prev.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Alert className="border-amber-500/20 bg-amber-500/5">
                    <AlertDescription className="text-[10px] leading-relaxed">
                      Friend percentages must stay below 100% so part of the recurring bill remains your own share.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Active */}
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs font-semibold">Active</Label>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeEdit}
                  disabled={isSavingEdit}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="min-w-[72px] cursor-pointer"
                >
                  {isSavingEdit ? (
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

      {/* ===== Delete Confirm Dialog ===== */}
      <Dialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <DialogContent className="max-w-[340px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">
                Delete Recurring Bill
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Are you sure you want to delete the recurring bill for{" "}
                <strong>{deletingItem?.name}</strong>?
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  This template will be permanently removed. History of past
                  paid transactions will not be deleted.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0"></div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="cursor-pointer"
              >
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
                  {isPayingItemCc
                    ? "This will pay off the credit card and record a dual-entry transfer transaction."
                    : (payingItem && "paymentMode" in payingItem && payingItem.paymentMode === "split_with_friends")
                      ? "This will deduct the full amount, record it in history, and auto-create Bill Friends entries from your saved split defaults."
                      : "This will deduct the full amount from the selected account and record it in history."}
                </span>
              </DialogDescription>
            </DialogHeader>

            {payingItem && (
              <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
                <div className="flex flex-col gap-3">
                  {isPayingItemCc && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold">
                        Payoff Amount
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                          {payingItem.currency === "JPY" ? "¥" : "Rp"}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={payoffAmount}
                          onChange={(e) =>
                            setPayoffAmount(formatInputAmount(e.target.value))
                          }
                          className={cn(
                            payingItem.currency === "JPY" ? "pl-7" : "pl-9",
                            "h-10 font-semibold text-sm",
                          )}
                          placeholder="e.g. 500,000"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-normal">
                        Default is the current outstanding balance. You can
                        enter a custom payoff amount (e.g. last month&apos;s
                        statement balance).
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">
                      {isPayingItemCc
                        ? "Deduct payment from account"
                        : "Pay from account"}
                    </Label>
                    <Select
                      value={paySourceAccountId}
                      onValueChange={setPaySourceAccountId}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((acc) => {
                            if (
                              acc.currency !== payingItem.currency ||
                              !acc.isActive
                            )
                              return false;
                            if (isPayingItemCc && acc.type === "credit_card")
                              return false;
                            return true;
                          })
                          .map((acc) => (
                            <SelectItem
                              key={acc.id}
                              value={acc.id}
                              className="text-xs"
                            >
                              {acc.name} (
                              {acc.currency === "JPY"
                                ? formatJPY(acc.balance)
                                : formatIDR(acc.balance)}
                              )
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="shrink-0 pt-4 gap-2 border-t border-border/20">
              <Button
                variant="outline"
                size="sm"
                onClick={closePay}
                disabled={!!isPayingId}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMarkPaid}
                disabled={
                  !!isPayingId ||
                  !paySourceAccountId ||
                  (isPayingItemCc && !payoffAmount)
                }
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
