"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/lib/actions/transactions";
import {
  getBillFriendsDataAction,
  createMultipleBillsAction,
} from "@/lib/actions/bill-friends";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconCalendar,
  IconLoader,
  IconPlus,
  IconTrash,
  IconUsers,
  IconChevronLeft,
  IconX,
  IconSparkles,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatInputAmount, parseInputAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { INCOME_SUBCATS, getDefaultSubCats } from "@/lib/categories";

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

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState<
    "living_expenses" | "personal_spending" | "income"
  >("living_expenses");
  const [subCategory, setSubCategory] = useState("others");
  const [mealNumber, setMealNumber] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date());

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Mode States
  const [isReceipt, setIsReceipt] = useState(false);
  const [receiptItems, setReceiptItems] = useState<
    { name: string; price: number }[]
  >([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const [aiTranslateLang, setAiTranslateLang] = useState<"none" | "id" | "en">(
    "none",
  );
  const [aiImportText, setAiImportText] = useState("");
  const [targetTotal, setTargetTotal] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("");

  // Split Bill States
  const [showSplitPrompt, setShowSplitPrompt] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPeople, setSplitPeople] = useState<string[]>(["Me"]);
  const [itemAssignments, setItemAssignments] = useState<
    Record<number, string[]>
  >({});
  const [existingFriendNames, setExistingFriendNames] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState("");
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(false);

  // Fetch existing friend names on mount
  useEffect(() => {
    async function fetchFriends() {
      const res = await getBillFriendsDataAction();
      if (res.success && res.data && Array.isArray(res.data.bills)) {
        const names = Array.from(
          new Set(res.data.bills.map((b: any) => b.personName)),
        ) as string[];
        setExistingFriendNames(names);
      }
    }
    fetchFriends();
  }, []);

  // Copy AI Prompt
  const handleCopyPrompt = () => {
    const promptText = `Analyze this receipt image. Extract all items and their final prices${
      aiTranslateLang === "id"
        ? ", translating the item names to Indonesian"
        : aiTranslateLang === "en"
          ? ", translating the item names to English"
          : ""
    }.\nMake sure the prices returned for each item include any tax, service charge, or fees (distribute them proportionally if listed separately).\nReturn the output STRICTLY in JSON format with this structure:\n{\n  "items": [\n    { "name": "Item Name", "price": 1000 }\n  ]\n}\nReturn only the raw JSON. Do not include markdown code block wrapper (like \`\`\`json) or any extra explanation.`;
    navigator.clipboard
      .writeText(promptText)
      .then(() => {
        setIsPromptCopied(true);
        toast.success("AI Prompt copied to clipboard!");
        setTimeout(() => setIsPromptCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy prompt:", err);
        toast.error("Failed to copy prompt. Please select and copy manually.");
      });
  };

  // Import by AI handler
  const handleImportByAi = () => {
    if (!aiImportText.trim()) {
      toast.error("Please paste the JSON response from the AI.");
      return;
    }

    try {
      let cleanText = aiImportText.trim();
      // Match markdown code blocks if present
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        cleanText = match[1].trim();
      }

      const parsed = JSON.parse(cleanText);
      let items: { name: string; price: number }[] = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.items)) {
        items = parsed.items;
      } else {
        throw new Error(
          "JSON must contain an 'items' array or be a list of items.",
        );
      }

      const validItems = items.map((item: any) => {
        if (!item.name || typeof item.price !== "number") {
          throw new Error(
            "Each item must have a 'name' and a numeric 'price'.",
          );
        }
        return {
          name: String(item.name).trim(),
          price: Number(item.price),
        };
      });

      if (validItems.length === 0) {
        toast.error("No valid items found to import.");
        return;
      }

      setReceiptItems((prev) => [...prev, ...validItems]);
      const importedTotal = validItems.reduce(
        (sum: number, item: { price: number }) => sum + item.price,
        0,
      );
      setTargetTotal(importedTotal.toString());
      toast.success(`Successfully imported ${validItems.length} items!`);
      setIsAiImportOpen(false);
      setAiImportText("");
    } catch (err: any) {
      console.error("Failed to parse imported JSON:", err);
      toast.error(
        err.message ||
          "Failed to parse receipt items. Please ensure you copied the exact JSON response.",
      );
    }
  };

  const subtotalReceiptAmount = receiptItems.reduce(
    (sum, item) => sum + item.price,
    0,
  );
  const taxRate = parseFloat(taxPercentage) || 0;
  const taxAmount = Math.round(subtotalReceiptAmount * (taxRate / 100));
  const totalReceiptAmount = subtotalReceiptAmount + taxAmount;
  const parsedTargetTotal = parseInputAmount(targetTotal);
  const receiptDifference = parsedTargetTotal - totalReceiptAmount;

  const activeAccount = accounts.find((a) => a.id === accountId);
  const currencySymbol = activeAccount?.currency === "IDR" ? "Rp" : "¥";

  const handleModeChange = (receiptMode: boolean) => {
    setIsReceipt(receiptMode);
    if (receiptMode) {
      setType("expense");
      setCategory("personal_spending");
      setSubCategory("shopping");
    } else {
      setType("expense");
      setCategory("living_expenses");
      setSubCategory("other");
    }
  };

  const handleCategoryChange = (
    cat: "living_expenses" | "personal_spending",
  ) => {
    setCategory(cat);
    setSubCategory("others");
    setMealNumber(null);
  };

  const handleSubCategoryChange = (sub: string) => {
    setSubCategory(sub);
    setMealNumber(null);
  };

  const handleSplitSave = async (totalAmount: number) => {
    const friends = splitPeople.filter((p) => p !== "Me");
    const currency = activeAccount?.currency || "JPY";
    const splitGroupId =
      "split_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();

    const billsToCreate: {
      personName: string;
      amount: number;
      currency: string;
      direction: "i_owe" | "they_owe";
      description: string;
      category?: string;
      subCategory?: string | null;
    }[] = [];

    friends.forEach((friendName) => {
      let friendShare = 0;
      receiptItems.forEach((item, idx) => {
        const consumers = itemAssignments[idx] || ["Me"];
        if (consumers.includes(friendName)) {
          friendShare += item.price / consumers.length;
        }
      });

      const friendShareWithTax = friendShare * (1 + taxRate / 100);
      const finalShare =
        currency === "JPY"
          ? Math.round(friendShareWithTax)
          : friendShareWithTax;

      if (finalShare > 0) {
        billsToCreate.push({
          personName: friendName.trim(),
          amount: finalShare,
          currency,
          direction: "they_owe",
          description: `[tx_id:${splitGroupId}] Split: ${description.trim() || "Receipt"} (Total: ${currency === "IDR" ? "Rp" : "¥"}${totalAmount.toLocaleString()})`,
          category,
          subCategory,
        });
      }
    });

    const receiptItemsWithAssignments = receiptItems.map((item, idx) => ({
      ...item,
      assigned: itemAssignments[idx] || ["Me"],
    }));

    const finalDescription = description.trim()
      ? `${description.trim()} [tx_id:${splitGroupId}]`
      : `[tx_id:${splitGroupId}]`;

    const transactionPayload = {
      userId,
      accountId,
      type,
      amount: totalAmount,
      category: type === "income" ? "income" : category,
      subCategory: type === "income" ? null : subCategory,
      mealNumber:
        type === "expense" && subCategory === "food" ? mealNumber : null,
      description: finalDescription,
      date,
      isReceipt: true,
      receiptItems: receiptItemsWithAssignments,
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      try {
        const txStored =
          localStorage.getItem("tsuzuru_offline_transactions") || "[]";
        const transactions = JSON.parse(txStored);
        transactions.push({ ...transactionPayload, date: date.toISOString() });
        localStorage.setItem(
          "tsuzuru_offline_transactions",
          JSON.stringify(transactions),
        );

        if (billsToCreate.length > 0) {
          const billsStored =
            localStorage.getItem("tsuzuru_offline_bills") || "[]";
          const bills = JSON.parse(billsStored);
          bills.push(...billsToCreate);
          localStorage.setItem("tsuzuru_offline_bills", JSON.stringify(bills));
        }

        toast.success("Offline: Transaction & split bill saved locally.");
        window.dispatchEvent(new CustomEvent("transaction-added"));
        router.push("/");
        return;
      } catch (err) {
        console.error("[Offline Split Save Error]", err);
        toast.error("Failed to save split bill transaction offline");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const resTx = await createTransactionAction(transactionPayload);
      if (!resTx.success) {
        toast.error(resTx.error || "Failed to save transaction");
        setIsSubmitting(false);
        return;
      }

      if (billsToCreate.length > 0) {
        const resBills = await createMultipleBillsAction(billsToCreate);
        if (!resBills.success) {
          toast.error(resBills.error || "Failed to save split bills");
          setIsSubmitting(false);
          return;
        }
      }

      toast.success("Transaction & split bills saved successfully");
      window.dispatchEvent(new CustomEvent("transaction-added"));
      router.push("/");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (bypassSplit = false) => {
    const parsedAmount = isReceipt
      ? totalReceiptAmount
      : parseInputAmount(amount);
    if (isReceipt && receiptItems.length === 0) {
      toast.error("Please add at least one item to the receipt");
      return;
    }
    if (!isReceipt && (!amount || parsedAmount <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Transaction amount must be greater than 0");
      return;
    }
    if (type === "expense" && !subCategory) {
      toast.error("Please select a sub-category");
      return;
    }

    setIsSubmitting(true);

    if (isReceipt && isSplitMode && !bypassSplit) {
      await handleSplitSave(parsedAmount);
      return;
    }

    // If offline, save the transaction payload locally in localStorage queue
    if (typeof window !== "undefined" && !navigator.onLine) {
      try {
        const payload = {
          userId,
          accountId,
          type,
          amount: parsedAmount,
          category: type === "income" ? "income" : category,
          subCategory,
          mealNumber:
            type === "expense" && subCategory === "food" ? mealNumber : null,
          description: description.trim() || null,
          date: date.toISOString(),
          isReceipt,
          receiptItems: isReceipt ? receiptItems : null,
        };

        const stored =
          localStorage.getItem("tsuzuru_offline_transactions") || "[]";
        const transactions = JSON.parse(stored);
        transactions.push(payload);
        localStorage.setItem(
          "tsuzuru_offline_transactions",
          JSON.stringify(transactions),
        );

        toast.success("Offline: Transaction saved locally.");
        window.dispatchEvent(new CustomEvent("transaction-added"));
        router.push("/");
        return;
      } catch (err) {
        console.error("[Offline] Failed to save transaction locally:", err);
        toast.error("Failed to save transaction locally when offline");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await createTransactionAction({
        userId,
        accountId,
        type,
        amount: parsedAmount,
        category: type === "income" ? "income" : category,
        subCategory,
        mealNumber:
          type === "expense" && subCategory === "food" ? mealNumber : null,
        description: description.trim() || null,
        date,
        isReceipt,
        receiptItems: isReceipt ? receiptItems : null,
      });

      if (res.success) {
        window.dispatchEvent(new CustomEvent("transaction-added"));
        router.push("/");
      } else {
        toast.error(res.error || "Failed to save transaction");
        setIsSubmitting(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReceipt && !showSplitPrompt && !isSplitMode) {
      setShowSplitPrompt(true);
      return;
    }
    await handleSave(false);
  };

  const subcatOptions =
    type === "income" ? INCOME_SUBCATS : getDefaultSubCats(category);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 flex-1 justify-between"
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {isSplitMode || showSplitPrompt ? (
            <button
              type="button"
              onClick={() => {
                if (isSplitMode) {
                  setIsSplitMode(false);
                  setShowSplitPrompt(true);
                } else {
                  setShowSplitPrompt(false);
                }
              }}
              className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors mr-1 cursor-pointer"
            >
              <IconChevronLeft className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors mr-1 cursor-pointer"
            >
              <IconArrowLeft className="size-5" />
            </button>
          )}
          <h1 className="font-sans text-2xl font-bold tracking-wide text-primary">
            {showSplitPrompt
              ? "Split Bill?"
              : isSplitMode
                ? "Split Bill Details"
                : "Add Transaction"}
          </h1>
        </div>

        <div
          className="flex-1 flex flex-col gap-4"
          onClick={() => setShowFriendSuggestions(false)}
        >
          {showSplitPrompt ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <IconUsers className="size-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Split Bill with Friends?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This transaction was created in Receipt Mode. Would you like
                  to split this bill with your friends?
                </p>
              </div>
              <div className="flex flex-col gap-2.5 w-full mt-2">
                <Button
                  type="button"
                  className="w-full h-11 rounded-xl text-xs font-semibold cursor-pointer"
                  onClick={() => {
                    const initial: Record<number, string[]> = {};
                    receiptItems.forEach((_, idx) => {
                      initial[idx] = ["Me"];
                    });
                    setItemAssignments(initial);
                    setSplitPeople(["Me"]);
                    setIsSplitMode(true);
                    setShowSplitPrompt(false);
                  }}
                >
                  Yes, Split Bill
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl text-xs font-semibold cursor-pointer"
                  onClick={async () => {
                    setShowSplitPrompt(false);
                    await handleSave(true);
                  }}
                  disabled={isSubmitting}
                >
                  No, Save Transaction Only
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold py-1 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowSplitPrompt(false);
                  }}
                >
                  Back to Receipt Details
                </button>
              </div>
            </div>
          ) : isSplitMode ? (
            <div className="flex flex-col gap-4 py-1">
              {/* People Selection */}
              <div className="flex flex-col gap-2 bg-muted/40 p-4 rounded-2xl border border-border/40">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  People in Split ({splitPeople.length})
                </Label>

                <div className="flex flex-wrap gap-2 mt-1">
                  {splitPeople.map((person) => (
                    <span
                      key={person}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                        person === "Me"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-white dark:bg-zinc-900 border-border text-foreground",
                      )}
                    >
                      {person}
                      {person !== "Me" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSplitPeople((prev) =>
                              prev.filter((p) => p !== person),
                            );
                            setItemAssignments((prev) => {
                              const updated = { ...prev };
                              Object.keys(updated).forEach((k) => {
                                const idx = Number(k);
                                updated[idx] = updated[idx].filter(
                                  (p) => p !== person,
                                );
                                if (updated[idx].length === 0) {
                                  updated[idx] = ["Me"];
                                }
                              });
                              return updated;
                            });
                          }}
                          className="text-muted-foreground hover:text-red-500 rounded-full p-0.5"
                        >
                          <IconX className="size-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div
                  className="relative flex gap-2 mt-2 pt-2 border-t border-border/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Add friend's name..."
                      value={newPersonInput}
                      onChange={(e) => {
                        setNewPersonInput(e.target.value);
                        setShowFriendSuggestions(true);
                      }}
                      onFocus={() => setShowFriendSuggestions(true)}
                      className="h-9 text-xs rounded-xl"
                    />

                    {showFriendSuggestions && newPersonInput.trim() !== "" && (
                      <div className="absolute z-50 left-0 right-0 top-10 bg-white dark:bg-zinc-950 border border-border/80 rounded-xl shadow-lg max-h-[150px] overflow-y-auto p-1 flex flex-col gap-0.5">
                        {existingFriendNames
                          .filter(
                            (name) =>
                              name
                                .toLowerCase()
                                .includes(newPersonInput.toLowerCase()) &&
                              !splitPeople.includes(name),
                          )
                          .map((name) => (
                            <button
                              key={name}
                              type="button"
                              className="text-left w-full px-3 py-2 text-xs hover:bg-muted rounded-lg font-medium text-foreground transition-colors cursor-pointer"
                              onClick={() => {
                                setSplitPeople((prev) => [...prev, name]);
                                setNewPersonInput("");
                                setShowFriendSuggestions(false);
                              }}
                            >
                              {name}
                            </button>
                          ))}
                        {existingFriendNames.filter(
                          (name) =>
                            name
                              .toLowerCase()
                              .includes(newPersonInput.toLowerCase()) &&
                            !splitPeople.includes(name),
                        ).length === 0 && (
                          <div className="text-[10px] text-muted-foreground p-2 text-center">
                            Press '+' to add new "${newPersonInput}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl cursor-pointer"
                    onClick={() => {
                      const name = newPersonInput.trim();
                      if (!name) return;
                      if (splitPeople.includes(name)) {
                        toast.error("This name has already been added");
                        return;
                      }
                      setSplitPeople((prev) => [...prev, name]);
                      setNewPersonInput("");
                      setShowFriendSuggestions(false);
                    }}
                  >
                    <IconPlus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Assign Items */}
              <div className="flex flex-col gap-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Allocate Receipt Items
                </Label>

                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto overflow-x-hidden pr-1">
                  {receiptItems.map((item, idx) => {
                    const assigned = itemAssignments[idx] || ["Me"];
                    const sharedPrice = item.price / assigned.length;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 bg-white dark:bg-zinc-900 border border-border/30 p-3 rounded-2xl text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground truncate max-w-[180px]">
                            {item.name}
                          </span>
                          <span className="font-extrabold text-foreground">
                            {currencySymbol}
                            {item.price.toLocaleString()}
                            {assigned.length > 1 && (
                              <span className="text-[10px] font-normal text-muted-foreground block text-right mt-0.5">
                                ({currencySymbol}
                                {Math.round(sharedPrice).toLocaleString()} /
                                person)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {splitPeople.map((person) => {
                            const isSelected = assigned.includes(person);
                            return (
                              <button
                                key={person}
                                type="button"
                                onClick={() => {
                                  setItemAssignments((prev) => {
                                    const updated = { ...prev };
                                    const currAssigned = updated[idx] || ["Me"];
                                    if (currAssigned.includes(person)) {
                                      if (currAssigned.length === 1) {
                                        toast.error(
                                          "At least 1 person must be assigned to this item",
                                        );
                                        return prev;
                                      }
                                      updated[idx] = currAssigned.filter(
                                        (p) => p !== person,
                                      );
                                    } else {
                                      updated[idx] = [...currAssigned, person];
                                    }
                                    return updated;
                                  });
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer",
                                  isSelected
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {person}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="flex flex-col gap-2 bg-primary/5 p-4 rounded-2xl border border-primary/10 mt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                  Split Summary
                </Label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {splitPeople.map((person) => {
                    let shareTotal = 0;
                    receiptItems.forEach((item, idx) => {
                      const assigned = itemAssignments[idx] || ["Me"];
                      if (assigned.includes(person)) {
                        shareTotal += item.price / assigned.length;
                      }
                    });

                    return (
                      <div
                        key={person}
                        className="flex items-center justify-between text-xs font-semibold"
                      >
                        <span className="text-muted-foreground">
                          {person} {person === "Me" && "(You)"}
                        </span>
                        <span className="font-bold text-foreground">
                          {currencySymbol}
                          {Math.round(shareTotal).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Mode Selector */}
              <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border border-border/10">
                <button
                  type="button"
                  onClick={() => handleModeChange(false)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    !isReceipt
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Single Transaction
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange(true)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    isReceipt
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Receipt Mode
                </button>
              </div>

              {!isReceipt ? (
                // === Single Transaction Layout ===
                <>
                  {/* Type toggle */}
                  <div className="flex bg-muted p-1 rounded-lg w-full border border-border/20">
                    {(["expense", "income"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setType(t);
                          if (t === "income") {
                            setIsReceipt(false);
                            setCategory("income");
                            setSubCategory("salary");
                          } else {
                            setCategory("living_expenses");
                            setSubCategory("other");
                          }
                        }}
                        className={cn(
                          "flex-1 h-10 rounded-md text-xs font-semibold tracking-wide transition-all capitalize cursor-pointer",
                          type === t
                            ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Amount
                    </Label>
                    <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-4 focus-within:border-primary transition-colors h-14 shadow-xs">
                      <span className="text-lg font-bold text-muted-foreground mr-2 select-none">
                        {currencySymbol}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) =>
                          setAmount(formatInputAmount(e.target.value))
                        }
                        className="flex-1 h-full text-lg font-bold font-sans tracking-wide bg-transparent focus:outline-none text-foreground"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Account */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Account
                    </Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem
                            key={acc.id}
                            value={acc.id}
                            className="text-sm"
                          >
                            {acc.name}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({acc.currency})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expense Category & Subcategory fields */}
                  {type === "expense" && (
                    <>
                      {/* Category toggle */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                          Category
                        </Label>
                        <div className="flex gap-2">
                          {(
                            ["living_expenses", "personal_spending"] as const
                          ).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategoryChange(cat)}
                              className={cn(
                                "flex-1 h-10 rounded-xl border text-xs font-semibold transition-all",
                                category === cat
                                  ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted",
                              )}
                            >
                              {cat === "living_expenses"
                                ? "Living Expenses"
                                : "Personal Spending"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sub-category */}
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                          Sub-category
                        </Label>
                        <Select
                          value={subCategory}
                          onValueChange={handleSubCategoryChange}
                        >
                          <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                            <SelectValue placeholder="Select sub-category" />
                          </SelectTrigger>
                          <SelectContent>
                            {subcatOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="text-sm"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Income Subcategory fields */}
                  {type === "income" && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                        Sub-category
                      </Label>
                      <Select
                        value={subCategory}
                        onValueChange={handleSubCategoryChange}
                      >
                        <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcatOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-sm"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Description{" "}
                      <span className="font-normal text-muted-foreground/70">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-12 rounded-2xl px-4 text-sm"
                      placeholder="e.g. Lawson, lunch at Yoshinoya, taxi"
                    />
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 justify-start rounded-2xl bg-white px-4 text-sm font-semibold shadow-xs dark:bg-zinc-900"
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
                </>
              ) : (
                // === Receipt Mode Layout ===
                <>
                  {/* 1. Description */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Description{" "}
                      <span className="font-normal text-muted-foreground/70">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-12 rounded-2xl px-4 text-sm"
                      placeholder="e.g. Lawson, lunch at Yoshinoya, taxi"
                    />
                  </div>

                  {/* Target Total & Tax % */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Target Total
                      </Label>
                      <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-3 h-10 focus-within:border-primary transition-colors shadow-xs">
                        <span className="text-sm font-bold text-muted-foreground mr-1.5 select-none">
                          {currencySymbol}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={targetTotal}
                          onChange={(e) =>
                            setTargetTotal(formatInputAmount(e.target.value))
                          }
                          className="flex-1 h-full text-sm font-bold font-sans bg-transparent focus:outline-none text-foreground"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Tax (%)
                      </Label>
                      <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl px-3 h-10 focus-within:border-primary transition-colors shadow-xs">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={taxPercentage}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setTaxPercentage(val);
                          }}
                          className="flex-1 h-full text-sm font-bold font-sans bg-transparent focus:outline-none text-foreground pr-4"
                          placeholder="0"
                        />
                        <span className="absolute right-3 text-sm font-bold text-muted-foreground select-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Receipt Items (Scan & List & Manual inputs) */}
                  <div className="flex flex-col gap-3 p-4 bg-muted/40 border border-border/50 rounded-2xl">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Receipt Items ({receiptItems.length})
                      </Label>

                      {/* Import by AI button */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="cursor-pointer flex items-center gap-1 text-[11px] h-7 px-2 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                          onClick={() => setIsAiImportOpen(true)}
                        >
                          <IconSparkles className="size-3.5" />
                          Import by AI
                        </Button>
                      </div>
                    </div>

                    {/* Items list */}
                    {receiptItems.length > 0 ? (
                      <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto overflow-x-hidden pr-1">
                        {receiptItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-border/30 px-3 py-2 rounded-xl text-xs"
                          >
                            <span className="font-semibold text-foreground truncate max-w-[150px]">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-muted-foreground">
                                {currencySymbol}
                                {item.price.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptItems((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-md transition-colors cursor-pointer"
                              >
                                <IconTrash className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(receiptItems.length > 0 || targetTotal) && (
                          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2.5 mt-2 px-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>Subtotal</span>
                              <span>
                                {currencySymbol}
                                {subtotalReceiptAmount.toLocaleString()}
                              </span>
                            </div>
                            {taxRate > 0 && (
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Tax ({taxRate}%)</span>
                                <span>
                                  {currencySymbol}
                                  {taxAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between font-bold text-foreground text-sm border-t border-border/20 pt-1.5 mt-1">
                              <span>Calculated Total</span>
                              <span>
                                {currencySymbol}
                                {totalReceiptAmount.toLocaleString()}
                              </span>
                            </div>

                            {targetTotal && (
                              <>
                                <div className="flex items-center justify-between font-semibold border-t border-border/20 pt-1.5 mt-1">
                                  <span className="text-muted-foreground">
                                    Target Total
                                  </span>
                                  <span className="text-foreground">
                                    {currencySymbol}
                                    {parsedTargetTotal.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between font-bold pt-1">
                                  <span className="text-muted-foreground">
                                    Difference
                                  </span>
                                  {(() => {
                                    if (receiptDifference === 0) {
                                      return (
                                        <span className="text-emerald-500 flex items-center gap-1">
                                          <IconCheck className="size-3.5" />{" "}
                                          Matched
                                        </span>
                                      );
                                    } else if (receiptDifference > 0) {
                                      return (
                                        <span className="text-amber-500">
                                          Short by {currencySymbol}
                                          {receiptDifference.toLocaleString()}
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-red-500">
                                          Over by {currencySymbol}
                                          {Math.abs(
                                            receiptDifference,
                                          ).toLocaleString()}
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-dashed border-border/50 rounded-xl">
                        No items added yet. Scan a receipt or add manually
                        below.
                      </div>
                    )}

                    {/* Add manual item form */}
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                        Add Item Manually
                      </span>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Item name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="h-8 text-xs flex-1 rounded-lg"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground select-none">
                            {currencySymbol}
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Price"
                            value={newItemPrice}
                            onChange={(e) =>
                              setNewItemPrice(formatInputAmount(e.target.value))
                            }
                            className="h-8 text-xs pl-7 rounded-lg font-semibold"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg shrink-0 cursor-pointer"
                          onClick={() => {
                            if (!newItemName.trim()) {
                              toast.error("Item name cannot be empty");
                              return;
                            }
                            const parsed = parseInputAmount(newItemPrice);
                            if (parsed <= 0) {
                              toast.error("Price must be greater than 0");
                              return;
                            }
                            setReceiptItems((prev) => [
                              ...prev,
                              { name: newItemName.trim(), price: parsed },
                            ]);
                            setNewItemName("");
                            setNewItemPrice("");
                          }}
                        >
                          <IconPlus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Account */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Account
                    </Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem
                            key={acc.id}
                            value={acc.id}
                            className="text-sm"
                          >
                            {acc.name}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({acc.currency})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Category */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Category
                    </Label>
                    <div className="flex gap-2">
                      {(["living_expenses", "personal_spending"] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryChange(cat)}
                            className={cn(
                              "flex-1 h-10 rounded-xl border text-xs font-semibold transition-all",
                              category === cat
                                ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                                : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted",
                            )}
                          >
                            {cat === "living_expenses"
                              ? "Living Expenses"
                              : "Personal Spending"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {/* 5. Sub-category */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Sub-category
                    </Label>
                    <Select
                      value={subCategory}
                      onValueChange={handleSubCategoryChange}
                    >
                      <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                        <SelectValue placeholder="Select sub-category" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcatOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-sm"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 6. Date */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 justify-start rounded-2xl bg-white px-4 text-sm font-semibold shadow-xs dark:bg-zinc-900"
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
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save button */}
      {!showSplitPrompt && (
        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide mt-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <IconLoader className="size-4 animate-spin" />
              Saving...
            </>
          ) : isSplitMode ? (
            "Save Split Bill"
          ) : (
            "Save Transaction"
          )}
        </Button>
      )}
      <Dialog open={isAiImportOpen} onOpenChange={setIsAiImportOpen}>
        <DialogContent className="max-w-[440px] rounded-2xl p-0">
          <div className="flex flex-col max-h-[85vh] p-6">
            <DialogHeader className="shrink-0 pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <IconSparkles className="size-5 text-primary animate-pulse" />
                Import Receipt Items by AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Follow this tutorial to extract items and prices using an
                external AI.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 min-h-0 pr-1">
              {/* Step 1 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    1
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    Photo your receipt
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-7">
                  Take a clear photo of your shopping receipt with your phone
                  camera, or prepare the receipt image file.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    2
                  </span>
                  <span className="text-xs font-bold text-foreground flex-1">
                    Copy prompt & paste to AI
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={handleCopyPrompt}
                    className="h-7 px-2.5 text-[11px] rounded-lg border-primary/20 text-primary hover:bg-primary/5 gap-1 shrink-0 cursor-pointer"
                  >
                    {isPromptCopied ? (
                      <>
                        <IconCheck className="size-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <IconCopy className="size-3" />
                        Copy Prompt
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground pl-7 leading-relaxed">
                  Send the prompt below to any AI model (ChatGPT, Gemini,
                  Claude) along with your receipt photo:
                </p>

                {/* Translate Option Switch */}
                <div className="flex flex-col gap-1.5 pl-7 my-1">
                  <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Translate item names:
                  </Label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAiTranslateLang("none")}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer",
                        aiTranslateLang === "none"
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border",
                      )}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTranslateLang("en")}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer",
                        aiTranslateLang === "en"
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border",
                      )}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTranslateLang("id")}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer",
                        aiTranslateLang === "id"
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-border",
                      )}
                    >
                      Indonesian
                    </button>
                  </div>
                </div>

                <div className="ml-7 p-2.5 rounded-xl bg-muted/50 border border-border/40 text-[10px] text-muted-foreground font-mono leading-normal max-h-[80px] overflow-y-auto select-all">
                  Analyze this receipt image. Extract all items and their final
                  prices
                  {aiTranslateLang === "id"
                    ? ", translating the item names to Indonesian"
                    : aiTranslateLang === "en"
                      ? ", translating the item names to English"
                      : ""}
                  . Make sure the prices returned for each item include any tax,
                  service charge, or fees (distribute them proportionally if
                  listed separately). Return the output STRICTLY in JSON format
                  with this structure:{" "}
                  {'{"items": [{"name": "Item Name", "price": 1000}]}'}. Return
                  only the raw JSON. Do not include markdown code block wrapper
                  (like \`\`\`json) or any extra explanation.
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    3
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    Paste AI Response
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-7">
                  Paste the JSON response generated by the AI below:
                </p>
                <div className="pl-7">
                  <textarea
                    value={aiImportText}
                    onChange={(e) => setAiImportText(e.target.value)}
                    placeholder={`e.g.\n{\n  "items": [\n    { "name": "Item A", "price": 100 }\n  ]\n}`}
                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 flex flex-row justify-end pt-4 border-t border-border/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAiImportOpen(false);
                  setAiImportText("");
                }}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImportByAi}
                className="rounded-xl h-9 text-xs min-w-[90px]"
              >
                Import
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
