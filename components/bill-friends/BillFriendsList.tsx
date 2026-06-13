"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createBillAction, settleBillAction, deleteBillAction, settleBillWithAllocationsAction } from "@/lib/actions/bill-friends";
import { toast } from "sonner";
import { formatJPY, formatIDR, formatInputAmount, parseInputAmount } from "@/lib/format";
import {
  IconPlus,
  IconCheck,
  IconLoader,
  IconTrash,
  IconArrowUpRight,
  IconArrowDownLeft,
  IconUsersGroup,
  IconCoin,
  IconEyeOff,
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

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BillItem {
  id: string;
  personName: string;
  amount: number;
  currency: string;
  direction: string;
  description: string | null;
  isSettled: boolean;
  settledAt: Date | null;
  createdAt: Date;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

interface BillFriendsListProps {
  bills: BillItem[];
  accounts: AccountItem[];
}

const formatAmount = (amount: number, currency: string) =>
  currency === "JPY" ? formatJPY(amount) : formatIDR(amount);

function groupByPerson(bills: BillItem[]) {
  const map = new Map<string, BillItem[]>();
  for (const bill of bills) {
    if (!map.has(bill.personName)) map.set(bill.personName, []);
    map.get(bill.personName)!.push(bill);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function BillFriendsList({ bills: initialBills, accounts = [] }: BillFriendsListProps) {
  const [bills, setBills] = useState<BillItem[]>(initialBills);
  const [activeTab, setActiveTab] = useState<"active" | "settled">("active");

  useEffect(() => {
    setBills(initialBills);
  }, [initialBills]);

  // Add form dialog
  const [addOpen, setAddOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [direction, setDirection] = useState<"i_owe" | "they_owe">("they_owe");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Action states
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hidden and collapsed person filters
  const [hiddenPersons, setHiddenPersons] = useState<string[]>([]);
  const [collapsedPersons, setCollapsedPersons] = useState<string[]>([]);

  // Split settlement dialog states
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleBillTarget, setSettleBillTarget] = useState<BillItem | null>(null);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSettling, setIsSettling] = useState(false);

  const activeBills = bills.filter((b) => !b.isSettled);
  const settledBills = bills.filter((b) => b.isSettled);
  const displayBills = activeTab === "active" ? activeBills : settledBills;

  // Summary stats
  const iOweJPY = activeBills.filter((b) => b.direction === "i_owe" && b.currency === "JPY").reduce((s, b) => s + b.amount, 0);
  const iOweIDR = activeBills.filter((b) => b.direction === "i_owe" && b.currency === "IDR").reduce((s, b) => s + b.amount, 0);
  const theyOweJPY = activeBills.filter((b) => b.direction === "they_owe" && b.currency === "JPY").reduce((s, b) => s + b.amount, 0);
  const theyOweIDR = activeBills.filter((b) => b.direction === "they_owe" && b.currency === "IDR").reduce((s, b) => s + b.amount, 0);

  // Suggestions from unique past friend names, ordered by recency
  const friendNameSuggestions = Array.from(
    new Set(bills.map((b) => b.personName.trim()))
  ).filter(Boolean);

  // Filter recommendations based on current input text
  const filteredSuggestions = friendNameSuggestions.filter((name) =>
    name.toLowerCase().includes(personName.toLowerCase())
  );

  const resetAddForm = () => {
    setPersonName(""); setAmount(""); setCurrency("JPY");
    setDirection("they_owe"); setDescription("");
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
        setPersonName(filteredSuggestions[activeIndex]);
        setShowSuggestions(false);
        setActiveIndex(-1);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      e.preventDefault();
    }
  };

  const handleAdd = async () => {
    const parsedAmount = parseInputAmount(amount);
    if (!personName.trim() || !amount || parsedAmount <= 0) {
      toast.error("Please fill in all required fields with valid values.");
      return;
    }

    setIsAdding(true);

    try {
      const res = await createBillAction({ personName, amount: parsedAmount, currency, direction, description: description || undefined });

      if (res.success) {
        toast.success("Bill added successfully");
        setBills((prev) => [
          {
            id: `temp-${Date.now()}`,
            personName, amount: parsedAmount, currency, direction,
            description: description || null, isSettled: false, settledAt: null, createdAt: new Date(),
          },
          ...prev,
        ]);
        resetAddForm();
        setAddOpen(false);
        window.dispatchEvent(new CustomEvent("bill-updated"));
      } else {
        toast.error(res.error || "Failed to add bill");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSettle = async (id: string) => {
    setSettlingId(id);
    try {
      const res = await settleBillAction(id);
      if (res.success) {
        toast.success("Bill settled successfully");
        setBills((prev) => prev.map((b) => b.id === id ? { ...b, isSettled: true, settledAt: new Date() } : b));
        window.dispatchEvent(new CustomEvent("bill-updated"));
      } else {
        toast.error(res.error || "Failed to settle");
      }
    } catch {
      toast.error("Unexpected error");
    } finally {
      setSettlingId(null);
    }
  };

  const openSettleDialog = (bill: BillItem) => {
    setSettleBillTarget(bill);
    const matching = accounts.filter((a) => a.currency === bill.currency);
    const initialAllocations: Record<string, string> = {};
    matching.forEach((acc, idx) => {
      initialAllocations[acc.id] = idx === 0 ? bill.amount.toString() : "";
    });
    setAllocations(initialAllocations);
    setSettleOpen(true);
  };

  const toggleHide = (name: string) => {
    setHiddenPersons((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const toggleCollapse = (name: string) => {
    setCollapsedPersons((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const matchingAccounts = settleBillTarget
    ? accounts.filter((a) => a.currency === settleBillTarget.currency)
    : [];

  const totalAllocated = matchingAccounts.reduce((sum, acc) => {
    const val = parseInputAmount(allocations[acc.id] || "");
    return sum + val;
  }, 0);

  const isSettleValid = settleBillTarget
    ? Math.abs(totalAllocated - settleBillTarget.amount) < 0.01
    : false;

  const handleSettleSubmit = async () => {
    if (!settleBillTarget || !isSettleValid) return;
    setIsSettling(true);
    try {
      const activeAllocations = matchingAccounts
        .map((acc) => ({
          accountId: acc.id,
          amount: parseInputAmount(allocations[acc.id] || ""),
        }))
        .filter((a) => a.amount > 0);

      const res = await settleBillWithAllocationsAction(settleBillTarget.id, activeAllocations);
      if (res.success) {
        toast.success("Bill settled successfully");
        setBills((prev) =>
          prev.map((b) =>
            b.id === settleBillTarget.id
              ? { ...b, isSettled: true, settledAt: new Date() }
              : b
          )
        );
        setSettleOpen(false);
        setSettleBillTarget(null);
        window.dispatchEvent(new CustomEvent("bill-updated"));
        window.dispatchEvent(new CustomEvent("transaction-added"));
      } else {
        toast.error(res.error || "Failed to settle bill");
      }
    } catch {
      toast.error("Unexpected error occurred");
    } finally {
      setIsSettling(false);
    }
  };



  const grouped = groupByPerson(displayBills);

  return (
    <div className="flex flex-col gap-5 flex-1 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.05 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">Bill Friends</h1>
          <p className="text-xs text-muted-foreground mt-1">Track what you owe and what&apos;s owed to you.</p>
        </div>
        <Button size="sm" onClick={() => { setAddOpen(true); resetAddForm(); }}>
          <IconPlus className="size-4" />
          Add Bill
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
        className="grid grid-cols-2 gap-2"
      >
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            They Owe
          </p>
          <p className="text-sm font-sans font-bold text-primary mt-1">
            {formatJPY(theyOweJPY)}
          </p>
          {theyOweIDR > 0 && (
            <p className="text-xs font-sans font-bold text-primary mt-0.5">
              {formatIDR(theyOweIDR)}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            I Owe
          </p>
          <p className="text-sm font-sans font-bold text-destructive mt-1">
            {formatJPY(iOweJPY)}
          </p>
          {iOweIDR > 0 && (
            <p className="text-xs font-sans font-bold text-destructive mt-0.5">
              {formatIDR(iOweIDR)}
            </p>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.15 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "settled")}>
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active{activeBills.length > 0 && ` (${activeBills.length})`}
            </TabsTrigger>
            <TabsTrigger value="settled" className="flex-1">
              Settled{settledBills.length > 0 && ` (${settledBills.length})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Bills list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
        className="flex-1 flex flex-col min-h-0"
      >
        {displayBills.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="p-4 rounded-full bg-muted">
              {activeTab === "active" ? (
                <IconUsersGroup className="size-8 text-muted-foreground/60" />
              ) : (
                <IconCoin className="size-8 text-muted-foreground/60" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {activeTab === "active" ? "No active bills" : "No settled bills yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "active" ? "Add a bill to start tracking" : "Settle active bills to see them here"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([person, personBills]) => {
              const isCollapsed = collapsedPersons.includes(person);
              const isHidden = hiddenPersons.includes(person);

              // Calculate net totals
              const personJPYTotal = personBills
                .filter((b) => b.currency === "JPY")
                .reduce((sum, b) => sum + (b.direction === "they_owe" ? b.amount : -b.amount), 0);
              const personIDRTotal = personBills
                .filter((b) => b.currency === "IDR")
                .reduce((sum, b) => sum + (b.direction === "they_owe" ? b.amount : -b.amount), 0);

              const renderTotalBadge = (total: number, currency: string) => {
                if (total === 0) return null;
                const formatted = currency === "JPY" ? formatJPY(Math.abs(total)) : formatIDR(Math.abs(total));
                const isPositive = total > 0;
                return (
                  <span className={cn(
                    "text-[10px] font-bold font-sans px-2 py-0.5 rounded-full border",
                    isPositive
                      ? "bg-primary/5 border-primary/20 text-primary"
                      : "bg-destructive/5 border-destructive/20 text-destructive"
                  )}>
                    {isPositive ? "+" : "-"}{formatted}
                  </span>
                );
              };

              return (
                <div key={person} className="flex flex-col gap-2">
                  {/* Person header */}
                  <div className="flex items-center gap-2 px-1">
                    <button
                      type="button"
                      onClick={() => toggleHide(person)}
                      className="flex items-center justify-center size-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
                      title={isHidden ? "Unhide friend" : "Hide friend"}
                    >
                      {isHidden ? (
                        <IconEyeOff className="size-3.5 text-primary" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary uppercase">{person.charAt(0)}</span>
                      )}
                    </button>
                    <span className="text-xs font-bold text-foreground">
                      {isHidden ? "****" : person}
                    </span>
                    <Separator className="flex-1" />
                    <div
                      onClick={() => toggleCollapse(person)}
                      className="flex gap-1.5 items-center cursor-pointer select-none shrink-0"
                      title="Click to collapse/expand"
                    >
                      {renderTotalBadge(personJPYTotal, "JPY")}
                      {renderTotalBadge(personIDRTotal, "IDR")}
                      {personJPYTotal === 0 && personIDRTotal === 0 && (
                        <span className="text-[10px] font-bold font-sans text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                          ¥0
                        </span>
                      )}
                    </div>
                  </div>

                    {/* Bills */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden w-full flex flex-col gap-2"
                        >
                          {personBills.map((bill) => {
                            const isOwed = bill.direction === "they_owe";
                            const isSettlingThis = settlingId === bill.id;
                            const isDeletingThis = deletingBill?.id === bill.id && isDeleting;

                            return (
                              <div
                                key={bill.id}
                                className={cn(
                                  "bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex justify-between items-center gap-3 shadow-xs transition-all",
                                  bill.isSettled ? "border-border/30 opacity-60" : isOwed ? "border-primary/20" : "border-destructive/20"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-xl shrink-0", bill.isSettled ? "bg-muted" : isOwed ? "bg-primary/10" : "bg-destructive/10")}>
                                    {bill.isSettled ? (
                                      <IconCheck className="size-4 text-muted-foreground stroke-[2]" />
                                    ) : isOwed ? (
                                      <IconArrowDownLeft className="size-4 text-primary stroke-[2.5]" />
                                    ) : (
                                      <IconArrowUpRight className="size-4 text-destructive stroke-[2.5]" />
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold text-foreground leading-tight">
                                      {bill.description || (isOwed ? "They owe me" : "I owe them")}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground leading-none">
                                      {bill.isSettled
                                        ? `Settled ${new Date(bill.settledAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                        : new Date(bill.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={cn(
                                    "text-sm font-bold font-sans",
                                    bill.isSettled ? "text-muted-foreground line-through" : isOwed ? "text-primary" : "text-destructive"
                                  )}>
                                    {formatAmount(bill.amount, bill.currency)}
                                  </span>

                                  {!bill.isSettled && (
                                    <Button
                                      size="icon-xs"
                                      variant="ghost"
                                      onClick={() => openSettleDialog(bill)}
                                      disabled={isSettlingThis || isDeletingThis}
                                      title="Mark as settled"
                                      className="text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      {isSettlingThis ? <IconLoader className="size-3 animate-spin" /> : <IconCheck className="size-3 stroke-[2.5]" />}
                                    </Button>
                                  )}
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => setDeletingBill(bill)}
                                    disabled={isSettlingThis || isDeletingThis}
                                    title="Delete"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    {isDeletingThis ? <IconLoader className="size-3 animate-spin" /> : <IconTrash className="size-3" />}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        )}
      </motion.div>

      {/* Add Bill Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!isAdding) { setAddOpen(open); if (!open) resetAddForm(); } }}>
        <DialogContent className="max-w-[380px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Add Bill</DialogTitle>
              <DialogDescription className="text-xs">Track a debt between you and a friend.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">

              {/* Direction */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Who owes whom?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("they_owe")}
                    className={cn(
                      "flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-semibold transition-all",
                      direction === "they_owe" ? "bg-primary/10 border-primary/40 text-primary" : "border-border/60 text-muted-foreground hover:border-border"
                    )}
                  >
                    <IconArrowDownLeft className="size-4 stroke-[2]" />
                    They owe me
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("i_owe")}
                    className={cn(
                      "flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-semibold transition-all",
                      direction === "i_owe" ? "bg-destructive/10 border-destructive/40 text-destructive" : "border-border/60 text-muted-foreground hover:border-border"
                    )}
                  >
                    <IconArrowUpRight className="size-4 stroke-[2]" />
                    I owe them
                  </button>
                </div>
              </div>

              {/* Person name */}
              <div className="flex flex-col gap-1.5 relative">
                <Label className="text-xs font-semibold">Friend&apos;s Name *</Label>
                <Input
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => {
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowSuggestions(false);
                      setActiveIndex(-1);
                    }, 150);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Aiko, Budi"
                  className="h-10"
                  autoComplete="off"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[66px] max-h-48 overflow-y-auto rounded-2xl border border-border/40 bg-white dark:bg-zinc-900 p-1.5 shadow-lg animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    <div className="flex flex-col gap-0.5">
                      {filteredSuggestions.map((name, index) => (
                        <button
                          key={name}
                          type="button"
                          onMouseDown={(e) => {
                            // Prevent input blur from triggering before selection
                            e.preventDefault();
                            setPersonName(name);
                            setShowSuggestions(false);
                            setActiveIndex(-1);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                            index === activeIndex
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

              {/* Amount + Currency */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label className="text-xs font-semibold">Amount *</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-muted-foreground select-none">
                      {currency === "JPY" ? "¥" : "Rp"}
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(formatInputAmount(e.target.value))}
                      placeholder="0"
                      className="pl-8 h-10 font-semibold"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 w-28">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY">JPY ¥</SelectItem>
                      <SelectItem value="IDR">IDR Rp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Dinner, Taxi fare"
                  className="h-10"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={isAdding}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={isAdding} className="min-w-[80px]">
                {isAdding ? <IconLoader className="size-4 animate-spin" /> : "Save Bill"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingBill} onOpenChange={(open) => { if (!isDeleting && !open) setDeletingBill(null); }}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Delete Bill</DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete this bill? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
              {deletingBill && (
                <div className="rounded-2xl border border-border/40 bg-muted/40 p-3 text-xs flex flex-col gap-1">
                  <p className="font-semibold text-foreground">{deletingBill.description || (deletingBill.direction === "they_owe" ? "They owe me" : "I owe them")}</p>
                  <p className="text-muted-foreground">
                    Friend: {deletingBill.personName} · Amount: {formatAmount(deletingBill.amount, deletingBill.currency)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingBill(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={async () => {
                if (!deletingBill) return;
                setIsDeleting(true);
                const res = await deleteBillAction(deletingBill.id);
                if (res.success) {
                  toast.success("Bill deleted successfully");
                  setBills((prev) => prev.filter((b) => b.id !== deletingBill.id));
                  setDeletingBill(null);
                  window.dispatchEvent(new CustomEvent("bill-updated"));
                } else {
                  toast.error(res.error || "Failed to delete");
                }
                setIsDeleting(false);
              }} disabled={isDeleting} className="min-w-[80px]">
                {isDeleting ? <IconLoader className="size-4 animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Split Dialog */}
      <Dialog open={settleOpen} onOpenChange={(open) => { if (!isSettling && !open) { setSettleOpen(false); setSettleBillTarget(null); } }}>
        <DialogContent className="max-w-[400px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans text-xl">Settle Bill</DialogTitle>
              <DialogDescription className="text-xs">
                Choose which financial accounts will receive or pay this bill.
              </DialogDescription>
            </DialogHeader>

            {settleBillTarget && (
              <>
                <div className="flex-1 overflow-y-auto px-1 py-4 flex flex-col gap-4 min-h-0">
                  <div className="rounded-2xl border border-border/40 bg-muted/40 p-3 text-xs flex flex-col gap-1">
                    <p className="font-semibold text-foreground">
                      {settleBillTarget.description || (settleBillTarget.direction === "they_owe" ? "They owe me" : "I owe them")}
                    </p>
                    <p className="text-muted-foreground">
                      Friend: {settleBillTarget.personName} · Total Amount: {formatAmount(settleBillTarget.amount, settleBillTarget.currency)}
                    </p>
                  </div>

                  {matchingAccounts.length === 0 ? (
                    <Alert variant="destructive" className="rounded-2xl">
                      <AlertDescription className="text-xs">
                        No active {settleBillTarget.currency} accounts found. Please activate one in Settings.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Label className="text-xs font-semibold">Allocate Settlement to Accounts *</Label>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Choose how the amount is split across your accounts.
                      </p>

                      <div className="flex flex-col gap-2">
                        {matchingAccounts.map((acc) => (
                          <div key={acc.id} className="flex items-center justify-between gap-3 p-2 border border-border/30 rounded-xl bg-white dark:bg-zinc-900">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-xs font-bold truncate text-foreground">{acc.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Current: {formatAmount(acc.balance, acc.currency)}
                              </span>
                            </div>
                            <div className="relative flex items-center w-36 shrink-0">
                              <span className="absolute left-3 text-xs font-bold text-muted-foreground select-none">
                                {settleBillTarget.currency === "JPY" ? "¥" : "Rp"}
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={allocations[acc.id] || ""}
                                onChange={(e) => {
                                  const val = formatInputAmount(e.target.value);
                                  setAllocations((prev) => ({ ...prev, [acc.id]: val }));
                                }}
                                placeholder="0"
                                className="pl-7 h-9 font-semibold text-xs text-right pr-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Allocation Status Indicator */}
                      <div className="flex justify-between items-center px-1 pt-2 border-t border-border/10 text-xs">
                        <span className="font-semibold text-muted-foreground">Total Allocated:</span>
                        <span className={cn(
                          "font-sans font-bold",
                          isSettleValid ? "text-primary" : "text-destructive"
                        )}>
                          {formatAmount(totalAllocated, settleBillTarget.currency)} / {formatAmount(settleBillTarget.amount, settleBillTarget.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="shrink-0 pt-4 border-t border-border/20 gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSettleOpen(false); setSettleBillTarget(null); }} disabled={isSettling}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSettleSubmit}
                    disabled={isSettling || !isSettleValid}
                    className="min-w-[80px]"
                  >
                    {isSettling ? <IconLoader className="size-4 animate-spin" /> : "Settle"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
