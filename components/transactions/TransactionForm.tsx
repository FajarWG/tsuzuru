"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/lib/actions/transactions";
import { IconArrowLeft, IconLoader, IconCheck } from "@tabler/icons-react";

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface TransactionFormProps {
  userId: string;
  accounts: AccountItem[];
}

export default function TransactionForm({
  userId,
  accounts,
}: TransactionFormProps) {
  const router = useRouter();

  // Form State
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState<"pocket_money" | "shopping">("pocket_money");
  const [subCategory, setSubCategory] = useState("food");
  const [mealNumber, setMealNumber] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    // Return YYYY-MM-DD local format
    return d.toLocaleDateString("sv-SE"); // sv-SE matches YYYY-MM-DD formatting exactly
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive active account details
  const activeAccount = accounts.find((a) => a.id === accountId);
  const currencySymbol = activeAccount?.currency === "IDR" ? "Rp" : "¥";

  // Handle category changes to set appropriate default subcategories
  const handleCategoryChange = (cat: "pocket_money" | "shopping") => {
    setCategory(cat);
    if (cat === "pocket_money") {
      setSubCategory("food");
    } else {
      setSubCategory("electronics");
    }
    setMealNumber(null);
  };

  // Handle subcategory changes
  const handleSubCategoryChange = (sub: string) => {
    setSubCategory(sub);
    if (sub === "food") {
      setMealNumber(1); // Default to 1st meal
    } else {
      setMealNumber(null);
    }
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
        date: new Date(date),
      });

      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Failed to save transaction");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1 justify-between">
      <div className="flex flex-col gap-4">
        {/* Header navigation */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <IconArrowLeft className="size-5" />
          </button>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
            Add Transaction
          </h1>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Type Toggle (Expense / Income) */}
        <div className="flex bg-muted p-1 rounded-xl w-full border border-border/20">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 h-10 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              type === "expense"
                ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 h-10 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              type === "income"
                ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
        </div>

        {/* Amount Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">
            Amount
          </label>
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-4 focus-within:border-primary transition-colors h-14 shadow-2xs">
            <span className="text-lg font-bold text-muted-foreground mr-2 select-none">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 h-full text-lg font-bold font-sans tracking-wide bg-transparent focus:outline-none text-foreground"
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Account Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">
            Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-12 px-4 border border-border/50 rounded-2xl bg-white dark:bg-zinc-900 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Category Inputs (Only visible for Expense type) */}
        {type === "expense" && (
          <>
            {/* Category Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-muted-foreground">
                Category
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCategoryChange("pocket_money")}
                  className={`flex-1 h-10 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    category === "pocket_money"
                      ? "bg-secondary text-primary-foreground border-transparent shadow-xs"
                      : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  Pocket Money
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange("shopping")}
                  className={`flex-1 h-10 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    category === "shopping"
                      ? "bg-secondary text-primary-foreground border-transparent shadow-xs"
                      : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  Shopping
                </button>
              </div>
            </div>

            {/* Sub-category Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wide text-muted-foreground">
                Sub-category
              </label>
              <select
                value={subCategory}
                onChange={(e) => handleSubCategoryChange(e.target.value)}
                className="w-full h-12 px-4 border border-border/50 rounded-2xl bg-white dark:bg-zinc-900 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
              >
                {category === "pocket_money" ? (
                  <>
                    <option value="food">Food</option>
                    <option value="drinks">Drinks</option>
                    <option value="transport">Transport</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="others">Others</option>
                  </>
                ) : (
                  <>
                    <option value="electronics">Electronics</option>
                    <option value="clothing">Clothing</option>
                    <option value="household">Household</option>
                    <option value="health">Healthcare</option>
                    <option value="others">Others</option>
                  </>
                )}
              </select>
            </div>

            {/* Meal Number (Only visible for Pocket Money -> Food) */}
            {category === "pocket_money" && subCategory === "food" && (
              <div className="flex flex-col gap-2 p-4 bg-secondary/5 border border-secondary/10 rounded-2xl">
                <label className="text-[11px] font-bold tracking-wide text-secondary uppercase">
                  Which meal of the day is this?
                </label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMealNumber(num)}
                      className={`flex-1 h-9 rounded-lg border text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                        mealNumber === num
                          ? "bg-primary text-primary-foreground border-transparent shadow-xs scale-102"
                          : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {num === 1 ? "1st" : num === 2 ? "2nd" : num === 3 ? "3rd" : "4th"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Optional Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-12 px-4 border border-border/50 rounded-2xl bg-white dark:bg-zinc-900 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-2xs"
            placeholder="e.g. Lawson, lunch at Yoshinoya, taxi"
          />
        </div>

        {/* Transaction Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-muted-foreground">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 px-4 border border-border/50 rounded-2xl bg-white dark:bg-zinc-900 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
            required
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm mt-4 cursor-pointer"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <IconLoader className="size-4 animate-spin" />
            Saving Transaction...
          </>
        ) : (
          "Save Transaction"
        )}
      </button>
    </form>
  );
}
