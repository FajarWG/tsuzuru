"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/lib/actions/transactions";
import { IconPlus, IconLoader, IconCalendar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface AddTransactionFabProps {
  userId: string;
  accounts: AccountItem[];
}

const POCKET_MONEY_SUBCATS = [
  { value: "food", label: "Food" },
  { value: "drinks", label: "Drinks" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "others", label: "Others" },
];

const SHOPPING_SUBCATS = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "household", label: "Household" },
  { value: "health", label: "Healthcare" },
  { value: "others", label: "Others" },
];

export default function AddTransactionFab({ userId, accounts }: AddTransactionFabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Form state
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState<"pocket_money" | "shopping">("pocket_money");
  const [subCategory, setSubCategory] = useState("food");
  const [mealNumber, setMealNumber] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccount = accounts.find((a) => a.id === accountId);
  const currencySymbol = activeAccount?.currency === "IDR" ? "Rp" : "¥";
  const subcatOptions = category === "pocket_money" ? POCKET_MONEY_SUBCATS : SHOPPING_SUBCATS;

  const resetForm = () => {
    setType("expense");
    setAmount("");
    setAccountId(accounts[0]?.id || "");
    setCategory("pocket_money");
    setSubCategory("food");
    setMealNumber(null);
    setDescription("");
    setDate(new Date());
    setError(null);
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  };

  const handleCategoryChange = (cat: "pocket_money" | "shopping") => {
    setCategory(cat);
    setSubCategory(cat === "pocket_money" ? "food" : "electronics");
    setMealNumber(null);
  };

  const handleSubCategoryChange = (sub: string) => {
    setSubCategory(sub);
    setMealNumber(sub === "food" ? 1 : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createTransactionAction({
        userId,
        accountId,
        type,
        amount: parseFloat(amount),
        category: type === "income" ? "income" : category,
        subCategory: type === "income" ? null : subCategory,
        mealNumber: type === "expense" && subCategory === "food" ? mealNumber : null,
        description: description.trim() || null,
        date,
      });

      if (res.success) {
        toast.success("Transaction added successfully");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to save transaction");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* FAB trigger button — replaces the Link in BottomNav */}
      <button
        onClick={handleOpen}
        aria-label="Add transaction"
        className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-150"
        style={{ boxShadow: "0 3px 12px rgba(45,90,61,0.45)" }}
      >
        <IconPlus className="size-[18px] stroke-[2.5]" />
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) setOpen(v); }}>
        <DialogContent className="max-w-[400px] rounded-2xl max-h-[90dvh] overflow-y-auto p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <DialogHeader className="pb-0">
              <DialogTitle className="font-serif text-xl">Add Transaction</DialogTitle>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Expense / Income toggle */}
            <div className="flex bg-muted p-1 rounded-xl border border-border/20">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold tracking-wide transition-all capitalize",
                    type === t
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Amount</Label>
              <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-xl px-4 h-13 focus-within:border-primary transition-colors shadow-xs">
                <span className="text-xl font-bold text-muted-foreground mr-2 select-none">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 h-full text-xl font-bold font-sans bg-transparent focus:outline-none text-foreground"
                  placeholder="0"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Account */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-sm">
                      {acc.name}{" "}
                      <span className="text-muted-foreground font-normal">({acc.currency})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category fields (expense only) */}
            {type === "expense" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
                  <div className="flex gap-2">
                    {(["pocket_money", "shopping"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={cn(
                          "flex-1 h-9 rounded-xl border text-xs font-semibold transition-all",
                          category === cat
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                        )}
                      >
                        {cat === "pocket_money" ? "Pocket Money" : "Shopping"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Sub-category</Label>
                  <Select value={subCategory} onValueChange={handleSubCategoryChange}>
                    <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subcatOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {category === "pocket_money" && subCategory === "food" && (
                  <div className="flex flex-col gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                    <Label className="text-[10px] font-bold tracking-wide text-primary uppercase">
                      Which meal?
                    </Label>
                    <div className="flex gap-2">
                      {[{ n: 1, label: "1st" }, { n: 2, label: "2nd" }, { n: 3, label: "3rd" }, { n: 4, label: "4th" }].map(({ n, label }) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMealNumber(n)}
                          className={cn(
                            "flex-1 h-8 rounded-lg border text-xs font-semibold transition-all",
                            mealNumber === n
                              ? "bg-primary text-primary-foreground border-transparent"
                              : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Description <span className="font-normal opacity-60">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11 rounded-xl text-sm"
                placeholder="e.g. Lawson, taxi, dinner"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-start rounded-xl bg-white px-3 text-sm font-semibold dark:bg-zinc-900"
                  >
                    <IconCalendar className="size-4 text-muted-foreground" />
                    {date.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      if (selectedDate) setDate(selectedDate);
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold mt-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><IconLoader className="size-4 animate-spin" /> Saving...</>
              ) : (
                "Save Transaction"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
