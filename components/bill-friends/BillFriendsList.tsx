"use client";

import { useState } from "react";
import { createBillAction, settleBillAction, deleteBillAction } from "@/lib/actions/bill-friends";
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

interface BillFriendsListProps {
  bills: BillItem[];
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

export default function BillFriendsList({ bills: initialBills }: BillFriendsListProps) {
  const [bills, setBills] = useState<BillItem[]>(initialBills);
  const [activeTab, setActiveTab] = useState<"active" | "settled">("active");

  // Add form dialog
  const [addOpen, setAddOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [direction, setDirection] = useState<"i_owe" | "they_owe">("they_owe");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Action states
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [deletingBill, setDeletingBill] = useState<BillItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeBills = bills.filter((b) => !b.isSettled);
  const settledBills = bills.filter((b) => b.isSettled);
  const displayBills = activeTab === "active" ? activeBills : settledBills;

  // Summary stats
  const iOweJPY = activeBills.filter((b) => b.direction === "i_owe" && b.currency === "JPY").reduce((s, b) => s + b.amount, 0);
  const iOweIDR = activeBills.filter((b) => b.direction === "i_owe" && b.currency === "IDR").reduce((s, b) => s + b.amount, 0);
  const theyOweJPY = activeBills.filter((b) => b.direction === "they_owe" && b.currency === "JPY").reduce((s, b) => s + b.amount, 0);
  const theyOweIDR = activeBills.filter((b) => b.direction === "they_owe" && b.currency === "IDR").reduce((s, b) => s + b.amount, 0);

  const resetAddForm = () => {
    setPersonName(""); setAmount(""); setCurrency("JPY");
    setDirection("they_owe"); setDescription("");
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
      } else {
        toast.error(res.error || "Failed to settle");
      }
    } catch {
      toast.error("Unexpected error");
    } finally {
      setSettlingId(null);
    }
  };



  const grouped = groupByPerson(displayBills);

  return (
    <div className="flex flex-col gap-5 flex-1 pb-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">Bill Friends</h1>
          <p className="text-xs text-muted-foreground mt-1">Track what you owe and what&apos;s owed to you.</p>
        </div>
        <Button size="sm" onClick={() => { setAddOpen(true); resetAddForm(); }}>
          <IconPlus className="size-4" />
          Add Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {/* Tabs */}
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

      {/* Bills list */}
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
          {grouped.map(([person, personBills]) => (
            <div key={person} className="flex flex-col gap-2">
              {/* Person header */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 shrink-0">
                  <span className="text-[10px] font-bold text-primary uppercase">{person.charAt(0)}</span>
                </div>
                <span className="text-xs font-bold text-foreground">{person}</span>
                <Separator className="flex-1" />
              </div>

              {/* Bills */}
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
                          onClick={() => handleSettle(bill.id)}
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
            </div>
          ))}
        </div>
      )}

      {/* Add Bill Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!isAdding) { setAddOpen(open); if (!open) resetAddForm(); } }}>
        <DialogContent className="max-w-[380px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-5">
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20">
              <DialogTitle className="font-sans">Add Bill</DialogTitle>
              <DialogDescription className="text-xs">Track a debt between you and a friend.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1 py-4 flex flex-col gap-4 min-h-0">

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
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Friend&apos;s Name *</Label>
                <Input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Aiko, Budi"
                  className="h-10"
                />
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

            <div className="flex-1 overflow-y-auto pr-1 py-4 flex flex-col gap-4 min-h-0">
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
    </div>
  );
}
