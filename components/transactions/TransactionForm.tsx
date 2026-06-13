"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/lib/actions/transactions";
import { checkAiLimitAction, parseReceiptTextAction } from "@/lib/actions/gemini";
import { getBillFriendsDataAction, createMultipleBillsAction } from "@/lib/actions/bill-friends";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { IconArrowLeft, IconCalendar, IconLoader, IconPlus, IconTrash, IconCamera, IconUpload, IconUsers, IconChevronLeft, IconX } from "@tabler/icons-react";
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

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface TransactionFormProps {
  userId: string;
  accounts: AccountItem[];
}

const POCKET_MONEY_SUBCATS = [
  { value: "shopping", label: "Shopping" },
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

export default function TransactionForm({ userId, accounts }: TransactionFormProps) {
  const router = useRouter();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState<"pocket_money" | "shopping">("pocket_money");
  const [subCategory, setSubCategory] = useState("others");
  const [mealNumber, setMealNumber] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date());

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Mode States
  const [isReceipt, setIsReceipt] = useState(false);
  const [receiptItems, setReceiptItems] = useState<{ name: string; price: number }[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [aiLimited, setAiLimited] = useState(false);
  const [aiLimitSeconds, setAiLimitSeconds] = useState(0);

  // Split Bill States
  const [showSplitPrompt, setShowSplitPrompt] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPeople, setSplitPeople] = useState<string[]>(["Me"]);
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({});
  const [existingFriendNames, setExistingFriendNames] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState("");
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(false);

  // Fetch existing friend names on mount
  useEffect(() => {
    async function fetchFriends() {
      const res = await getBillFriendsDataAction();
      if (res.success && res.data && Array.isArray(res.data.bills)) {
        const names = Array.from(
          new Set(res.data.bills.map((b: any) => b.personName))
        ) as string[];
        setExistingFriendNames(names);
      }
    }
    fetchFriends();
  }, []);

  // Check AI rate limit on mount
  useEffect(() => {
    async function checkLimit() {
      const res = await checkAiLimitAction();
      if (res.limited) {
        setAiLimited(true);
        setAiLimitSeconds(res.secondsLeft || 0);
      }
    }
    checkLimit();
  }, []);

  // AI rate limit countdown
  useEffect(() => {
    if (aiLimitSeconds <= 0) return;
    const interval = setInterval(() => {
      setAiLimitSeconds((sec) => {
        if (sec <= 1) {
          setAiLimited(false);
          clearInterval(interval);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aiLimitSeconds]);

  // Scan receipt handler
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check limit
    const limitCheck = await checkAiLimitAction();
    if (limitCheck.limited) {
      toast.error(`AI is temporarily rate-limited. Please wait ${limitCheck.secondsLeft} seconds.`);
      setAiLimited(true);
      setAiLimitSeconds(limitCheck.secondsLeft || 0);
      return;
    }

    setIsScanning(true);
    setScanStatus("Reading text from receipt image (OCR)...");

    try {
      const worker = await createWorker("eng+jpn");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      if (!text || !text.trim()) {
        toast.error("Could not read any text from the receipt. Please try another image or add items manually.");
        setIsScanning(false);
        setScanStatus("");
        return;
      }

      setScanStatus("Parsing receipt text with Gemini AI...");
      const res = await parseReceiptTextAction(text);

      if (res.success && res.data && Array.isArray(res.data.items)) {
        const parsedItems = res.data.items.map((item: any) => ({
          name: item.name || "Unknown Item",
          price: Number(item.price) || 0
        }));
        setReceiptItems((prev) => [...prev, ...parsedItems]);
        toast.success(`Successfully parsed ${parsedItems.length} items from receipt!`);
      } else {
        toast.error(res.error || "Failed to parse receipt with AI");
        if (res.error?.includes("limited") || res.error?.includes("limit reached")) {
          setAiLimited(true);
          setAiLimitSeconds(300);
        }
      }
    } catch (err) {
      console.error("OCR/AI Scan Error:", err);
      toast.error("Failed to process receipt. Please add items manually.");
    } finally {
      setIsScanning(false);
      setScanStatus("");
    }
  };

  const totalReceiptAmount = receiptItems.reduce((sum, item) => sum + item.price, 0);

  const activeAccount = accounts.find((a) => a.id === accountId);
  const currencySymbol = activeAccount?.currency === "IDR" ? "Rp" : "¥";

  const handleModeChange = (receiptMode: boolean) => {
    setIsReceipt(receiptMode);
    if (receiptMode) {
      setType("expense");
      setCategory("pocket_money");
      setSubCategory("shopping");
    } else {
      setType("expense");
      setCategory("pocket_money");
      setSubCategory("others");
    }
  };

  const handleCategoryChange = (cat: "pocket_money" | "shopping") => {
    setCategory(cat);
    setSubCategory("others");
    setMealNumber(null);
  };

  const handleSubCategoryChange = (sub: string) => {
    setSubCategory(sub);
    setMealNumber(sub === "food" ? 1 : null);
  };

  const handleSplitSave = async (totalAmount: number) => {
    const friends = splitPeople.filter(p => p !== "Me");
    const currency = activeAccount?.currency || "JPY";
    const splitGroupId = "split_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();

    const billsToCreate: {
      personName: string;
      amount: number;
      currency: string;
      direction: "i_owe" | "they_owe";
      description: string;
    }[] = [];

    friends.forEach((friendName) => {
      let friendShare = 0;
      receiptItems.forEach((item, idx) => {
        const consumers = itemAssignments[idx] || ["Me"];
        if (consumers.includes(friendName)) {
          friendShare += item.price / consumers.length;
        }
      });

      const finalShare = currency === "JPY" ? Math.round(friendShare) : friendShare;

      if (finalShare > 0) {
        billsToCreate.push({
          personName: friendName.trim(),
          amount: finalShare,
          currency,
          direction: "they_owe",
          description: `[tx_id:${splitGroupId}] Split: ${description.trim() || "Receipt"} (Total: ${currency === "IDR" ? "Rp" : "¥"}${totalAmount.toLocaleString()})`,
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
      mealNumber: type === "expense" && subCategory === "food" ? mealNumber : null,
      description: finalDescription,
      date,
      isReceipt: true,
      receiptItems: receiptItemsWithAssignments,
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      try {
        const txStored = localStorage.getItem("tsuzuru_offline_transactions") || "[]";
        const transactions = JSON.parse(txStored);
        transactions.push({ ...transactionPayload, date: date.toISOString() });
        localStorage.setItem("tsuzuru_offline_transactions", JSON.stringify(transactions));

        if (billsToCreate.length > 0) {
          const billsStored = localStorage.getItem("tsuzuru_offline_bills") || "[]";
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
    const parsedAmount = isReceipt ? totalReceiptAmount : parseInputAmount(amount);
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
          subCategory: type === "income" ? null : subCategory,
          mealNumber: type === "expense" && subCategory === "food" ? mealNumber : null,
          description: description.trim() || null,
          date: date.toISOString(),
          isReceipt,
          receiptItems: isReceipt ? receiptItems : null,
        };

        const stored = localStorage.getItem("tsuzuru_offline_transactions") || "[]";
        const transactions = JSON.parse(stored);
        transactions.push(payload);
        localStorage.setItem("tsuzuru_offline_transactions", JSON.stringify(transactions));

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
        subCategory: type === "income" ? null : subCategory,
        mealNumber: type === "expense" && subCategory === "food" ? mealNumber : null,
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

  const subcatOptions = category === "pocket_money" ? POCKET_MONEY_SUBCATS : SHOPPING_SUBCATS;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1 justify-between">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {(isSplitMode || showSplitPrompt) ? (
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
            {showSplitPrompt ? "Split Bill?" : isSplitMode ? "Split Bill Details" : "Add Transaction"}
          </h1>
        </div>

        <div className="flex-1 flex flex-col gap-4" onClick={() => setShowFriendSuggestions(false)}>
          {showSplitPrompt ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <IconUsers className="size-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-foreground">Split Bill with Friends?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This transaction was created in Receipt Mode. Would you like to split this bill with your friends?
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
                          : "bg-white dark:bg-zinc-900 border-border text-foreground"
                      )}
                    >
                      {person}
                      {person !== "Me" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSplitPeople((prev) => prev.filter((p) => p !== person));
                            setItemAssignments((prev) => {
                              const updated = { ...prev };
                              Object.keys(updated).forEach((k) => {
                                const idx = Number(k);
                                updated[idx] = updated[idx].filter((p) => p !== person);
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

                <div className="relative flex gap-2 mt-2 pt-2 border-t border-border/20" onClick={(e) => e.stopPropagation()}>
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
                          .filter((name) => 
                            name.toLowerCase().includes(newPersonInput.toLowerCase()) &&
                            !splitPeople.includes(name)
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
                        {existingFriendNames.filter((name) => 
                          name.toLowerCase().includes(newPersonInput.toLowerCase()) &&
                          !splitPeople.includes(name)
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
                
                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
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
                            {currencySymbol}{item.price.toLocaleString()}
                            {assigned.length > 1 && (
                              <span className="text-[10px] font-normal text-muted-foreground block text-right mt-0.5">
                                ({currencySymbol}{Math.round(sharedPrice).toLocaleString()} / person)
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
                                        toast.error("At least 1 person must be assigned to this item");
                                        return prev;
                                      }
                                      updated[idx] = currAssigned.filter((p) => p !== person);
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
                                    : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground"
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
                      <div key={person} className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{person} {person === "Me" && "(You)"}</span>
                        <span className="font-bold text-foreground">
                          {currencySymbol}{Math.round(shareTotal).toLocaleString()}
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
                : "text-muted-foreground hover:text-foreground"
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
                : "text-muted-foreground hover:text-foreground"
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
                    }
                  }}
                  className={cn(
                    "flex-1 h-10 rounded-md text-xs font-semibold tracking-wide transition-all capitalize cursor-pointer",
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
                  onChange={(e) => setAmount(formatInputAmount(e.target.value))}
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
                    <SelectItem key={acc.id} value={acc.id} className="text-sm">
                      {acc.name}{" "}
                      <span className="text-muted-foreground font-normal">({acc.currency})</span>
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
                    {(["pocket_money", "shopping"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={cn(
                          "flex-1 h-10 rounded-xl border text-xs font-semibold transition-all",
                          category === cat
                            ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                            : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                        )}
                      >
                        {cat === "pocket_money" ? "Pocket Money" : "Shopping"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-category */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                    Sub-category
                  </Label>
                  <Select value={subCategory} onValueChange={handleSubCategoryChange}>
                    <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                      <SelectValue placeholder="Select sub-category" />
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

                {/* Meal number (food only) */}
                {category === "pocket_money" && subCategory === "food" && (
                  <div className="flex flex-col gap-2 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <Label className="text-[11px] font-bold tracking-wide text-primary uppercase">
                      Which meal of the day?
                    </Label>
                    <div className="flex gap-2 mt-1">
                      {[
                        { n: 1, label: "1st" },
                        { n: 2, label: "2nd" },
                        { n: 3, label: "3rd" },
                        { n: 4, label: "4th" },
                      ].map(({ n, label }) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMealNumber(n)}
                          className={cn(
                            "flex-1 h-9 rounded-lg border text-xs font-semibold tracking-wider transition-all",
                            mealNumber === n
                              ? "bg-primary text-primary-foreground border-transparent shadow-xs"
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
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                Description <span className="font-normal text-muted-foreground/70">(optional)</span>
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
                Description <span className="font-normal text-muted-foreground/70">(optional)</span>
              </Label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12 rounded-2xl px-4 text-sm"
                placeholder="e.g. Lawson, lunch at Yoshinoya, taxi"
              />
            </div>

            {/* 2. Receipt Items (Scan & List & Manual inputs) */}
            <div className="flex flex-col gap-3 p-4 bg-muted/40 border border-border/50 rounded-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Receipt Items ({receiptItems.length})
                </Label>
                
                {/* Scan & Upload buttons */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    id="receipt-camera"
                    accept="image/*"
                    capture="environment"
                    onChange={handleScanReceipt}
                    className="hidden"
                    disabled={isScanning || aiLimited}
                  />
                  <input
                    type="file"
                    id="receipt-upload"
                    accept="image/*"
                    onChange={handleScanReceipt}
                    className="hidden"
                    disabled={isScanning || aiLimited}
                  />
                  
                  {/* Scan Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className={cn(
                      "cursor-pointer flex items-center gap-1 text-[11px] h-7 px-2 rounded-lg border-primary/30 text-primary hover:bg-primary/5",
                      aiLimited && "border-amber-500/30 text-amber-600 dark:text-amber-500 hover:bg-amber-500/5 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (aiLimited) {
                        toast.error(`AI is temporarily limited. Please wait ${aiLimitSeconds}s.`);
                        return;
                      }
                      document.getElementById("receipt-camera")?.click();
                    }}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <IconLoader className="size-3.5 animate-spin" />
                    ) : (
                      <IconCamera className="size-3.5" />
                    )}
                    {isScanning ? "Processing..." : aiLimited ? `AI Limit` : "Scan"}
                  </Button>

                  {/* Upload Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className={cn(
                      "cursor-pointer flex items-center gap-1 text-[11px] h-7 px-2 rounded-lg border-primary/30 text-primary hover:bg-primary/5",
                      aiLimited && "border-amber-500/30 text-amber-600 dark:text-amber-500 hover:bg-amber-500/5 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (aiLimited) {
                        toast.error(`AI is temporarily limited. Please wait ${aiLimitSeconds}s.`);
                        return;
                      }
                      document.getElementById("receipt-upload")?.click();
                    }}
                    disabled={isScanning}
                  >
                    <IconUpload className="size-3.5" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Scan Status banner */}
              {isScanning && (
                <div className="text-xs text-primary font-medium flex items-center gap-1.5 animate-pulse bg-primary/5 p-2 rounded-lg border border-primary/10">
                  <IconLoader className="size-3 animate-spin" />
                  <span>{scanStatus}</span>
                </div>
              )}

              {/* Items list */}
              {receiptItems.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {receiptItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-border/30 px-3 py-2 rounded-xl text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[150px]">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted-foreground">
                          {currencySymbol}{item.price.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptItems((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-md transition-colors cursor-pointer"
                        >
                          <IconTrash className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {receiptItems.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-2 px-1">
                      <span className="text-xs font-semibold text-muted-foreground">Total Amount</span>
                      <span className="text-sm font-bold text-foreground">
                        {currencySymbol}{totalReceiptAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 px-4 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-dashed border-border/50 rounded-xl">
                  No items added yet. Scan a receipt or add manually below.
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
                      onChange={(e) => setNewItemPrice(formatInputAmount(e.target.value))}
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
                      setReceiptItems((prev) => [...prev, { name: newItemName.trim(), price: parsed }]);
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
                    <SelectItem key={acc.id} value={acc.id} className="text-sm">
                      {acc.name}{" "}
                      <span className="text-muted-foreground font-normal">({acc.currency})</span>
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
                {(["pocket_money", "shopping"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={cn(
                      "flex-1 h-10 rounded-xl border text-xs font-semibold transition-all",
                      category === cat
                        ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {cat === "pocket_money" ? "Pocket Money" : "Shopping"}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Sub-category */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground">
                Sub-category
              </Label>
              <Select value={subCategory} onValueChange={handleSubCategoryChange}>
                <SelectTrigger className="h-12 rounded-2xl text-sm font-semibold px-4">
                  <SelectValue placeholder="Select sub-category" />
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
    </form>
  );
}
