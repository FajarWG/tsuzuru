"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createTransactionAction } from "@/lib/actions/transactions";
import {
  getBillFriendsDataAction,
  createMultipleBillsAction,
} from "@/lib/actions/bill-friends";
import {
  IconPlus,
  IconLoader,
  IconCalendar,
  IconTrash,
  IconUsers,
  IconChevronLeft,
  IconX,
  IconSparkles,
  IconCopy,
  IconCheck,
  IconCamera,
  IconUpload,
  IconCreditCard,
  IconReceipt,
} from "@tabler/icons-react";
import {
  checkAiLimitAction,
  parseReceiptImageAction,
} from "@/lib/actions/gemini";
import { formatInputAmount, parseInputAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  INCOME_SUBCATS,
  getDefaultSubCats,
  SubCatOption,
} from "@/lib/categories";

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface AddTransactionFabProps {
  userId: string;
  accounts: AccountItem[];
  budgetCategories?: { name: string; label: string; subCategories?: any }[];
}



function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.75,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback to original file
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, ".jpg"),
            {
              type: "image/jpeg",
            },
          );
          resolve(compressedFile);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}

function roundAmount(value: number): number {
  const floorVal = Math.floor(value);
  const decimal = value - floorVal;
  if (decimal >= 0.6) {
    return floorVal + 1;
  } else {
    return floorVal;
  }
}

export default function AddTransactionFab({
  userId,
  accounts,
  budgetCategories,
}: AddTransactionFabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const categoriesToUse =
    budgetCategories && budgetCategories.length > 0
      ? budgetCategories
      : [
          { name: "living_expenses", label: "Living Expenses" },
          { name: "personal_spending", label: "Personal Spending" },
        ];

  // Flow state
  const [activeMode, setActiveMode] = useState<"select" | "single" | "receipt">(
    "select",
  );
  const [aiImportMode, setAiImportMode] = useState<"auto" | "manual">("auto");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [category, setCategory] = useState<string>("living_expenses");
  const [subCategory, setSubCategory] = useState("others");
  const [mealNumber, setMealNumber] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Mode States
  const [isReceipt, setIsReceipt] = useState(false);
  const [receiptSetupStep, setReceiptSetupStep] = useState<"setup" | "items">("setup");
  const [receiptItems, setReceiptItems] = useState<
    { name: string; price: number; category?: string; subCategory?: string }[]
  >([]);
  const [openCategoryPickerIdx, setOpenCategoryPickerIdx] = useState<number | null>(null);
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
    if (open) {
      fetchFriends();
    }
  }, [open]);

  // Copy AI Prompt
  const handleCopyPrompt = () => {
    const hasUserTax = parseFloat(taxPercentage) > 0;
    const taxInstructions = hasUserTax
      ? "Extract the base prices BEFORE tax (excluding any tax, service charge, or fees listed separately)."
      : "Make sure the prices returned for each item include any tax, service charge, or fees (distribute them proportionally if listed separately).";

    const promptText = `Analyze this receipt image. Extract all items and their final prices${
      aiTranslateLang === "id"
        ? ", translating the item names to Indonesian"
        : aiTranslateLang === "en"
          ? ", translating the item names to English"
          : ""
    }.\n${taxInstructions}\nReturn the output STRICTLY in JSON format with this structure:\n{\n  "items": [\n    { "name": "Item Name", "price": 1000 }\n  ]\n}\nReturn only the raw JSON. Do not include markdown code block wrapper (like \`\`\`json) or any extra explanation.`;
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
          price: roundAmount(Number(item.price)),
        };
      });

      if (validItems.length === 0) {
        toast.error("No valid items found to import.");
        return;
      }

      setReceiptItems((prev) => [...prev, ...validItems]);
      const importedTotal = validItems.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
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
  // Get subcategory options for the active category.
  // If the BudgetLimit in DB has custom subCategories, use those; else use defaults.
  const getSubcatOptionsForCategory = (cat: string): SubCatOption[] => {
    if (type === "income") return INCOME_SUBCATS;
    // Find matching budget category which may carry custom subCategories from DB
    const matchedCat = budgetCategories?.find((bc) => bc.name === cat) as
      | (typeof budgetCategories extends (infer T)[] | undefined ? T & { subCategories?: SubCatOption[] } : never)
      | undefined;
    if (matchedCat && "subCategories" in matchedCat && Array.isArray((matchedCat as { subCategories?: SubCatOption[] }).subCategories) && ((matchedCat as { subCategories?: SubCatOption[] }).subCategories?.length ?? 0) > 0) {
      return (matchedCat as { subCategories?: SubCatOption[] }).subCategories!;
    }
    return getDefaultSubCats(cat);
  };

  const subcatOptions = getSubcatOptionsForCategory(category);

  const resetForm = () => {
    setActiveMode("select");
    setAiImportMode("auto");
    setIsAiParsing(false);
    setType("expense");
    setAmount("");
    setAccountId(accounts[0]?.id || "");
    setCategory(categoriesToUse[0]?.name || "living_expenses");
    setSubCategory("others");
    setMealNumber(null);
    setDescription("");
    setDate(new Date());
    setIsReceipt(false);
    setReceiptSetupStep("setup");
    setReceiptItems([]);
    setOpenCategoryPickerIdx(null);
    setNewItemName("");
    setNewItemPrice("");
    setTargetTotal("");
    setTaxPercentage("");
    setShowSplitPrompt(false);
    setIsSplitMode(false);
    setSplitPeople(["Me"]);
    setItemAssignments({});
    setNewPersonInput("");
    setShowFriendSuggestions(false);
  };

  // Cleanup previewUrl on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleClearSelectedImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let finalFile = file;

    // 1. Check if the file is HEIC and convert it to JPEG
    const isHeic =
      file.type === "image/heic" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");
    if (isHeic) {
      const convertingToast = toast.loading("Converting HEIC image to JPEG...");
      try {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });
        const blob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        finalFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
          type: "image/jpeg",
        });
        toast.success("Image successfully converted!", { id: convertingToast });
      } catch (err: any) {
        console.error("Failed to convert HEIC image:", err);
        toast.error(
          "Failed to convert HEIC image. Please upload a JPEG or PNG.",
          { id: convertingToast },
        );
        return;
      }
    }

    // 2. Compress the image (works for all: JPEG, PNG, converted HEIC)
    const compressionToast = toast.loading(
      "Compressing and optimizing receipt photo...",
    );
    try {
      finalFile = await compressImage(finalFile, 1200, 1200, 0.75);
      toast.success("Image optimized successfully!", { id: compressionToast });
    } catch (err) {
      console.error("Image compression failed:", err);
      toast.error("Image optimization failed, using original file.", {
        id: compressionToast,
      });
    }

    setSelectedImage(finalFile);
    const url = URL.createObjectURL(finalFile);
    setPreviewUrl(url);
  };

  const handleSendImageToAi = async () => {
    if (!selectedImage) return;

    try {
      const limitRes = await checkAiLimitAction();
      if (limitRes.limited) {
        toast.error(
          `AI is temporarily limited. Try again in ${limitRes.secondsLeft} seconds, or use the manual prompt mode.`,
        );
        return;
      }
    } catch (err) {
      console.error("Failed to check AI limit:", err);
    }

    setIsAiParsing(true);
    const loadingToast = toast.loading("Analyzing receipt photo...");

    try {
      const { base64, mimeType } = await fileToBase64(selectedImage);
      const hasUserTax = parseFloat(taxPercentage) > 0;
      const res = await parseReceiptImageAction(
        base64,
        mimeType,
        aiTranslateLang,
        hasUserTax,
      );

      if (res.success && res.data && Array.isArray(res.data.items)) {
        const parsedItems = res.data.items.map((item: any) => ({
          name: String(item.name).trim(),
          price: roundAmount(Number(item.price)),
        }));

        if (parsedItems.length > 0) {
          setReceiptItems((prev) => [...prev, ...parsedItems]);
          const importedTotal = parsedItems.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
          setTargetTotal(importedTotal.toString());
          toast.success(
            `Successfully imported ${parsedItems.length} items from receipt!`,
            { id: loadingToast },
          );
          setIsAiImportOpen(false);
          handleClearSelectedImage();
        } else {
          toast.error("No items could be extracted from the receipt.", {
            id: loadingToast,
          });
        }
      } else {
        toast.error(res.error || "Failed to analyze receipt", {
          id: loadingToast,
        });
      }
    } catch (err: any) {
      console.error("Failed to auto-parse receipt image:", err);
      toast.error(err.message || "Failed to parse receipt image", {
        id: loadingToast,
      });
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  };

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

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    // Default to first subcat of the new category
    const firstSub = getDefaultSubCats(cat)[0]?.value ?? "other";
    setSubCategory(firstSub);
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
        currency === "JPY" ? Math.round(friendShareWithTax) : friendShareWithTax;

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
      category: item.category ?? category,
      subCategory: item.subCategory ?? subCategory,
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
        setOpen(false);
        resetForm();
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
      setOpen(false);
      resetForm();
      router.refresh();
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
          receiptItems: isReceipt
            ? receiptItems.map((item) => ({
                ...item,
                category: item.category ?? category,
                subCategory: item.subCategory ?? subCategory,
              }))
            : null,
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
        setOpen(false);
        resetForm();
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
        receiptItems: isReceipt
          ? receiptItems.map((item) => ({
              ...item,
              category: item.category ?? category,
              subCategory: item.subCategory ?? subCategory,
            }))
          : null,
      });

      if (res.success) {
        toast.success("Transaction added successfully");
        window.dispatchEvent(new CustomEvent("transaction-added"));
        setOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save transaction");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
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

  return (
    <>
      {/* FAB trigger button — replaces the Link in BottomNav */}
      <button
        onClick={handleOpen}
        aria-label="Add transaction"
        className="flex items-center justify-center w-11 h-11 rounded-[15px] bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-150"
        style={{ boxShadow: "0 3px 12px rgba(45,90,61,0.45)" }}
      >
        <IconPlus className="size-[22px] stroke-[2.5]" />
      </button>

      {/* Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!isSubmitting) setOpen(v);
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-0" layout={false}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col max-h-[85vh] p-5"
          >
            <DialogHeader className="pb-4 shrink-0 border-b border-border/20 flex flex-row items-center gap-3">
              {showSplitPrompt || isSplitMode ? (
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
                  className="p-1 rounded-lg hover:bg-muted text-foreground transition-colors mr-1 cursor-pointer"
                >
                  <IconChevronLeft className="size-4" />
                </button>
              ) : activeMode !== "select" ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode("select");
                  }}
                  className="p-1 rounded-lg hover:bg-muted text-foreground transition-colors mr-1 cursor-pointer"
                >
                  <IconChevronLeft className="size-4" />
                </button>
              ) : null}
              <DialogTitle className="font-sans text-xl">
                {showSplitPrompt
                  ? "Split Bill?"
                  : isSplitMode
                    ? "Split Bill Details"
                    : activeMode === "select"
                      ? "Select Mode"
                      : activeMode === "single"
                        ? "Single Transaction"
                        : "Receipt Mode"}
              </DialogTitle>
            </DialogHeader>

            <div
              className="flex-1 overflow-y-auto overflow-x-hidden px-1 flex flex-col gap-4 py-3"
              onClick={() => { setShowFriendSuggestions(false); setOpenCategoryPickerIdx(null); }}
            >
              <AnimatePresence mode="wait">
                {showSplitPrompt ? (
                  <motion.div
                    key="split-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col items-center justify-center py-6 px-4 gap-6 text-center"
                  >
                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <IconUsers className="size-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        Split Bill with Friends?
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This transaction was created in Receipt Mode. Would you
                        like to split this bill with your friends?
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
                  </motion.div>
                ) : isSplitMode ? (
                  <motion.div
                    key="split-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col gap-4 py-1"
                  >
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

                          {showFriendSuggestions &&
                            newPersonInput.trim() !== "" && (
                              <div className="absolute z-50 left-0 right-0 top-10 bg-white dark:bg-zinc-950 border border-border/80 rounded-xl shadow-lg max-h-[150px] overflow-y-auto p-1 flex flex-col gap-0.5">
                                {existingFriendNames
                                  .filter(
                                    (name) =>
                                      name
                                        .toLowerCase()
                                        .includes(
                                          newPersonInput.toLowerCase(),
                                        ) && !splitPeople.includes(name),
                                  )
                                  .map((name) => (
                                    <button
                                      key={name}
                                      type="button"
                                      className="text-left w-full px-3 py-2 text-xs hover:bg-muted rounded-lg font-medium text-foreground transition-colors cursor-pointer"
                                      onClick={() => {
                                        setSplitPeople((prev) => [
                                          ...prev,
                                          name,
                                        ]);
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
                                      {Math.round(
                                        sharedPrice,
                                      ).toLocaleString()}{" "}
                                      / person)
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
                                          const currAssigned = updated[idx] || [
                                            "Me",
                                          ];
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
                                            updated[idx] = [
                                              ...currAssigned,
                                              person,
                                            ];
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
                  </motion.div>
                ) : activeMode === "select" ? (
                  // === Initial Selection Screen ===
                  <motion.div
                    key="select-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col gap-5 py-4 px-2"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Option 1: Single Transaction */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode("single");
                          setIsReceipt(false);
                          handleModeChange(false);
                        }}
                        className="group flex items-start gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/50 hover:bg-muted/30 dark:hover:bg-zinc-800/20 bg-white dark:bg-zinc-900 transition-all duration-200 hover:scale-[1.01] active:scale-95 text-left cursor-pointer"
                      >
                        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <IconCreditCard className="size-6 stroke-[2]" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-foreground">
                            Single Transaction
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-relaxed">
                            Record a simple manual expense or income
                            transaction.
                          </span>
                        </div>
                      </button>

                      {/* Option 2: Receipt Mode */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode("receipt");
                          setIsReceipt(true);
                          handleModeChange(true);
                        }}
                        className="group flex items-start gap-4 p-4 rounded-2xl border border-border/50 hover:border-emerald-500/50 hover:bg-muted/30 dark:hover:bg-zinc-800/20 bg-white dark:bg-zinc-900 transition-all duration-200 hover:scale-[1.01] active:scale-95 text-left cursor-pointer"
                      >
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                          <IconReceipt className="size-6 stroke-[2]" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-foreground">
                            Receipt Mode
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-relaxed">
                            List multiple items from a receipt or scan to split
                            with friends.
                          </span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-mode"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex flex-col gap-4"
                  >
                    {!isReceipt ? (
                      // === Single Transaction Layout ===
                      <>
                        {/* Expense / Income toggle */}
                        <div className="flex bg-muted p-1 rounded-lg border border-border/20">
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
                                "flex-1 h-9 rounded-md text-xs font-semibold tracking-wide transition-all capitalize cursor-pointer",
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
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Amount
                          </Label>
                          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-xl px-4 h-13 focus-within:border-primary transition-colors shadow-xs">
                            <span className="text-xl font-bold text-muted-foreground mr-2 select-none">
                              {currencySymbol}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={amount}
                              onChange={(e) =>
                                setAmount(formatInputAmount(e.target.value))
                              }
                              className="flex-1 h-full text-xl font-bold font-sans bg-transparent focus:outline-none text-foreground"
                              placeholder="0"
                              required
                            />
                          </div>
                        </div>

                        {/* Account */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Account
                          </Label>
                          <Select
                            value={accountId}
                            onValueChange={setAccountId}
                          >
                            <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                              <SelectValue />
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

                        {/* Category fields (expense only) */}
                        {type === "expense" && (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground">
                                Category
                              </Label>
                              <div className="flex gap-2">
                                {categoriesToUse.map((cat) => (
                                  <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() =>
                                      handleCategoryChange(cat.name)
                                    }
                                    className={cn(
                                      "flex-1 h-9 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                                      category === cat.name
                                        ? "bg-primary text-primary-foreground border-transparent"
                                        : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-muted",
                                    )}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Subcategory */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground">
                                Sub-category
                              </Label>
                              <Select
                                value={subCategory}
                                onValueChange={handleSubCategoryChange}
                              >
                                <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
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

                        {/* Income Subcategory */}
                        {type === "income" && (
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Sub-category
                            </Label>
                            <Select
                              value={subCategory}
                              onValueChange={handleSubCategoryChange}
                            >
                              <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
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
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Description{" "}
                            <span className="font-normal opacity-60">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-11 rounded-xl"
                            placeholder="e.g. Lawson, taxi, dinner"
                          />
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Date
                          </Label>
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
                            <PopoverContent
                              align="start"
                              className="w-auto p-0"
                            >
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
                    ) : receiptSetupStep === "setup" ? (
                      // === Receipt Mode Setup Step 1 ===
                      <>
                        {/* 1. Category */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Default Category
                          </Label>
                          <div className="flex bg-muted p-1 rounded-lg border border-border/20">
                            {(["living_expenses", "personal_spending"] as const).map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setCategory(cat);
                                  // Update subcategory defaults
                                  const defaults = getSubcatOptionsForCategory(cat);
                                  setSubCategory(defaults[0]?.value ?? "other");
                                }}
                                className={cn(
                                  "flex-1 h-9 rounded-md text-xs font-semibold tracking-wide transition-all capitalize cursor-pointer",
                                  category === cat
                                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {cat === "living_expenses" ? "Living Expenses" : "Personal Spending"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Sub-category */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Sub-category <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={subCategory}
                            onValueChange={handleSubCategoryChange}
                          >
                            <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
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

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Description <span className="font-normal opacity-60">(optional)</span>
                          </Label>
                          <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-11 rounded-xl"
                            placeholder="e.g. Lawson, taxi, dinner"
                          />
                        </div>

                        {/* 3. Total Amount & Tax side-by-side */}
                        <div className="flex gap-3">
                          <div className="flex-1 flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Total Amount <span className="font-normal opacity-60">(optional)</span>
                            </Label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-xl px-3.5 h-12 focus-within:border-primary transition-colors shadow-xs">
                              <span className="text-base font-bold text-muted-foreground mr-1.5 select-none">
                                {currencySymbol}
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={targetTotal}
                                onChange={(e) => setTargetTotal(formatInputAmount(e.target.value))}
                                className="flex-1 h-full text-sm font-bold font-sans bg-transparent focus:outline-none text-foreground"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="w-[100px] flex flex-col gap-1.5 shrink-0">
                            <Label className="text-xs font-semibold text-muted-foreground text-center">
                              Tax (%) <span className="font-normal opacity-60">(opt)</span>
                            </Label>
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-border/50 rounded-xl px-3 h-12 focus-within:border-primary transition-colors shadow-xs">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={taxPercentage}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, "");
                                  if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) < 100)) {
                                    setTaxPercentage(val);
                                  }
                                }}
                                className="flex-1 h-full text-sm font-semibold font-sans bg-transparent focus:outline-none text-foreground pr-5 text-center"
                                placeholder="0"
                              />
                              <span className="absolute right-3 text-sm font-bold text-muted-foreground select-none">
                                %
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Next Button */}
                        <Button
                          type="button"
                          className="w-full h-11 rounded-xl font-semibold mt-2 cursor-pointer flex items-center justify-center gap-1.5"
                          onClick={() => {
                            if (!category) {
                              toast.error("Please select a category");
                              return;
                            }
                            if (!subCategory) {
                              toast.error("Please select a sub-category");
                              return;
                            }
                            // Move to items step!
                            setReceiptSetupStep("items");
                          }}
                        >
                          Continue to Items
                        </Button>
                      </>
                    ) : (
                      // === Receipt Mode Layout (Step 2: Items) ===
                      <>
                        {/* Summary Card of Setup */}
                        <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/50 rounded-xl text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-muted-foreground">
                              {category === "living_expenses" ? "Living Expenses" : "Personal Spending"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80">
                              Sub-category: <strong className="text-foreground">{subcatOptions.find(s => s.value === subCategory)?.label ?? subCategory}</strong>
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {parseInputAmount(targetTotal) > 0 ? (
                              <span className="font-bold text-foreground">
                                {currencySymbol}{parseInputAmount(targetTotal).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No Target Total</span>
                            )}
                            {parseFloat(taxPercentage) > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                Tax: {taxPercentage}%
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptSetupStep("setup")}
                            className="text-[10px] text-primary hover:underline font-semibold ml-3 cursor-pointer shrink-0"
                          >
                            Edit Setup
                          </button>
                        </div>


                        {/* 2. Receipt Items (Scan & List & Manual inputs) */}
                        <div className="flex flex-col gap-3 p-4 bg-muted/40 border border-border/50 rounded-xl">
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
                              {receiptItems.map((item, idx) => {
                                const effectiveCat = item.category ?? category;
                                const effectiveSubCat = item.subCategory ?? subCategory;
                                const isOverridden = !!item.category;
                                const catLabel = categoriesToUse.find(c => c.name === effectiveCat)?.label ?? effectiveCat;
                                const allSubcats = [
                                  ...getDefaultSubCats("living_expenses"),
                                  ...getDefaultSubCats("personal_spending"),
                                  ...INCOME_SUBCATS,
                                ];
                                const subCatLabel = allSubcats.find(s => s.value === effectiveSubCat)?.label ?? effectiveSubCat;
                                const catColor = effectiveCat === "living_expenses"
                                  ? isOverridden
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50"
                                    : "bg-muted text-muted-foreground border-border/30"
                                  : effectiveCat === "personal_spending"
                                  ? isOverridden
                                    ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/50"
                                    : "bg-muted text-muted-foreground border-border/30"
                                  : isOverridden
                                    ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/50"
                                    : "bg-muted text-muted-foreground border-border/30";

                                return (
                                  <div
                                    key={idx}
                                    className="flex flex-col bg-white dark:bg-zinc-900 border border-border/30 px-3 py-2 rounded-lg text-xs gap-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => {
                                          const newName = e.target.value;
                                          setReceiptItems((prev) =>
                                            prev.map((it, i) =>
                                              i === idx ? { ...it, name: newName } : it,
                                            ),
                                          );
                                        }}
                                        className="font-semibold text-foreground bg-transparent focus:outline-none focus:border-b focus:border-primary border-b border-transparent flex-1 min-w-0 truncate"
                                        placeholder="Item name"
                                      />
                                      <div className="flex items-center gap-1 shrink-0">
                                        <div className="flex items-center gap-0.5 font-bold text-muted-foreground">
                                          <span>{currencySymbol}</span>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={item.price === 0 ? "" : item.price}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/[^0-9]/g, "");
                                              const newPrice = val ? parseInt(val, 10) : 0;
                                              setReceiptItems((prev) =>
                                                prev.map((it, i) =>
                                                  i === idx ? { ...it, price: newPrice } : it,
                                                ),
                                              );
                                            }}
                                            className="w-[64px] text-right font-bold bg-transparent focus:outline-none focus:border-b focus:border-primary border-b border-transparent text-foreground"
                                            placeholder="0"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReceiptItems((prev) => prev.filter((_, i) => i !== idx));
                                            if (openCategoryPickerIdx === idx) setOpenCategoryPickerIdx(null);
                                          }}
                                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-md transition-colors cursor-pointer ml-0.5"
                                        >
                                          <IconTrash className="size-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Category badge row */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenCategoryPickerIdx(openCategoryPickerIdx === idx ? null : idx);
                                        }}
                                        className={cn(
                                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer",
                                          catColor,
                                        )}
                                      >
                                        {catLabel}/{subCatLabel}
                                        <svg className="size-2.5 opacity-60" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      </button>
                                      {isOverridden && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setReceiptItems((prev) =>
                                              prev.map((it, i) =>
                                                i === idx ? { ...it, category: undefined, subCategory: undefined } : it,
                                              ),
                                            )
                                          }
                                          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline underline-offset-1"
                                        >
                                          reset
                                        </button>
                                      )}
                                    </div>

                                    {/* Inline category picker */}
                                    {openCategoryPickerIdx === idx && (
                                      <div
                                        className="flex flex-col gap-1.5 pt-1.5 mt-0.5 border-t border-border/30"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Category selector */}
                                        <div className="flex gap-1">
                                          {categoriesToUse.map((cat) => (
                                            <button
                                              key={cat.name}
                                              type="button"
                                              onClick={() => {
                                                const defaultSub = getDefaultSubCats(cat.name)[0]?.value ?? "other";
                                                setReceiptItems((prev) =>
                                                  prev.map((it, i) =>
                                                    i === idx
                                                      ? { ...it, category: cat.name, subCategory: defaultSub }
                                                      : it,
                                                  ),
                                                );
                                              }}
                                              className={cn(
                                                "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer",
                                                effectiveCat === cat.name
                                                  ? "bg-primary text-primary-foreground border-transparent"
                                                  : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted",
                                              )}
                                            >
                                              {cat.label}
                                            </button>
                                          ))}
                                        </div>
                                        {/* Sub-category selector */}
                                        <div className="flex flex-wrap gap-1">
                                          {getSubcatOptionsForCategory(effectiveCat).map((sub) => (
                                            <button
                                              key={sub.value}
                                              type="button"
                                              onClick={() =>
                                                setReceiptItems((prev) =>
                                                  prev.map((it, i) =>
                                                    i === idx ? { ...it, subCategory: sub.value, category: effectiveCat } : it,
                                                  ),
                                                )
                                              }
                                              className={cn(
                                                "px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer",
                                                effectiveSubCat === sub.value
                                                  ? "bg-primary/10 text-primary border-primary/30"
                                                  : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted",
                                              )}
                                            >
                                              {sub.label}
                                            </button>
                                          ))}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setOpenCategoryPickerIdx(null)}
                                          className="text-[10px] font-semibold text-primary hover:text-primary/80 text-right cursor-pointer transition-colors"
                                        >
                                          Done ✓
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-5 px-4 text-xs text-muted-foreground bg-white dark:bg-zinc-900 border border-dashed border-border/50 rounded-lg">
                              No items added yet. Scan a receipt or add manually
                              below.
                            </div>
                          )}

                          {(receiptItems.length > 0 || targetTotal) && (
                            <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2 mt-1 px-1 text-xs">
                              {taxRate > 0 && (
                                <>
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>
                                      {currencySymbol}
                                      {subtotalReceiptAmount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Tax ({taxRate}%)</span>
                                    <span>
                                      {currencySymbol}
                                      {taxAmount.toLocaleString()}
                                    </span>
                                  </div>
                                </>
                              )}
                              <div className="flex items-center justify-between font-bold text-foreground text-sm border-t border-border/20 pt-1.5 mt-1">
                                <span>Total</span>
                                <span>
                                  {currencySymbol}
                                  {totalReceiptAmount.toLocaleString()}
                                </span>
                              </div>

                              {targetTotal && parseInputAmount(targetTotal) > 0 && (
                                <div className="flex items-center justify-between font-semibold border-t border-border/20 pt-1.5 mt-1">
                                  <span className="text-muted-foreground">Target Total</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-foreground">
                                      {currencySymbol}
                                      {parsedTargetTotal.toLocaleString()}
                                    </span>
                                    {(() => {
                                      if (receiptDifference === 0) {
                                        return (
                                          <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-0.5">
                                            <IconCheck className="size-3" /> Matched
                                          </span>
                                        );
                                      } else if (receiptDifference > 0) {
                                        return (
                                          <span className="text-amber-500 text-[10px] font-bold">
                                            (Short by {currencySymbol}{receiptDifference.toLocaleString()})
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span className="text-red-500 text-[10px] font-bold">
                                            (Over by {currencySymbol}{Math.abs(receiptDifference).toLocaleString()})
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Add manual item form */}
                          <div className="flex flex-col gap-1.5 mt-1 pt-1 border-t border-border/40">
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
                                    setNewItemPrice(
                                      formatInputAmount(e.target.value),
                                    )
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
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Account
                          </Label>
                          <Select
                            value={accountId}
                            onValueChange={setAccountId}
                          >
                            <SelectTrigger className="h-11 rounded-xl text-sm font-semibold">
                              <SelectValue />
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

                        {/* 4. Date */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Date
                          </Label>
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
                                }).trim()}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-auto p-0"
                            >
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

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            {!showSplitPrompt && activeMode !== "select" && !(isReceipt && receiptSetupStep === "setup") && (
              <div className="shrink-0 pt-4 mt-auto border-t border-border/20">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl text-sm font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader className="size-4 animate-spin" /> Saving...
                    </>
                  ) : isSplitMode ? (
                    "Save Split Bill"
                  ) : (
                    "Save Transaction"
                  )}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAiImportOpen}
        onOpenChange={(v) => {
          if (!isAiParsing) {
            setIsAiImportOpen(v);
            if (!v) {
              handleClearSelectedImage();
            }
          }
        }}
      >
        <DialogContent className="max-w-[440px] rounded-2xl p-0" layout={false}>
          <div className="flex flex-col max-h-[85vh] p-6">
            <DialogHeader className="shrink-0 pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <IconSparkles className="size-5 text-primary animate-pulse" />
                Import Receipt Items by AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Automatically scan your receipt or generate prompts for manual
                parsing.
              </DialogDescription>
            </DialogHeader>

            {/* Mode Tabs */}
            <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border border-border/10 mb-3 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setAiImportMode("auto")}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  aiImportMode === "auto"
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                disabled={isAiParsing}
              >
                Automatic Scan
              </button>
              <button
                type="button"
                onClick={() => setAiImportMode("manual")}
                className={cn(
                  "flex-1 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  aiImportMode === "manual"
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                disabled={isAiParsing}
              >
                Manual Prompt
              </button>
            </div>

            {/* Global Language Selector */}
            <div className="flex flex-col gap-1.5 p-3 mb-3 bg-muted/20 border border-border/40 rounded-xl shrink-0">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Translate item names:
              </Label>
              <div className="flex gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => setAiTranslateLang("none")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                    aiTranslateLang === "none"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                  )}
                  disabled={isAiParsing}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setAiTranslateLang("en")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                    aiTranslateLang === "en"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                  )}
                  disabled={isAiParsing}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setAiTranslateLang("id")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                    aiTranslateLang === "id"
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/30",
                  )}
                  disabled={isAiParsing}
                >
                  Indonesian
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-4 min-h-0 pr-1">
              {aiImportMode === "auto" ? (
                <>
                  {previewUrl ? (
                    <div className="flex flex-col gap-4">
                      {/* Image Preview Container */}
                      <div className="relative border border-border/60 rounded-2xl overflow-hidden aspect-video bg-zinc-950 flex items-center justify-center group shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Selected receipt preview"
                          className="w-full h-full object-contain max-h-[220px]"
                        />
                        {/* Clear Photo Button */}
                        <button
                          type="button"
                          onClick={handleClearSelectedImage}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-all cursor-pointer shadow-xs border border-white/10"
                          disabled={isAiParsing}
                          title="Remove photo"
                        >
                          <IconX className="size-4" />
                        </button>
                      </div>

                      {/* Info / Send Button */}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={handleSendImageToAi}
                          disabled={isAiParsing}
                          className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          {isAiParsing ? (
                            <>
                              <IconLoader className="size-4 animate-spin text-primary-foreground" />
                              Analyzing receipt...
                            </>
                          ) : (
                            <>
                              <IconSparkles className="size-4 text-primary-foreground animate-pulse" />
                              Send Photo to AI
                            </>
                          )}
                        </Button>
                        <span className="text-[10px] text-muted-foreground text-center">
                          Selected file: {selectedImage?.name} (
                          {selectedImage?.size
                            ? (selectedImage.size / 1024 / 1024).toFixed(2)
                            : 0}{" "}
                          MB)
                        </span>
                      </div>
                    </div>
                  ) : (
                    // === Original Upload Box ===
                    <div className="flex flex-col gap-4 py-2">
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                        disabled={isAiParsing}
                        ref={fileInputRef}
                      />

                      <label
                        htmlFor="receipt-upload"
                        className={cn(
                          "flex flex-col items-center justify-center border border-dashed border-border/80 rounded-2xl p-8 bg-muted/10 transition-all text-center group gap-3",
                          isAiParsing
                            ? "cursor-not-allowed opacity-80"
                            : "cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/10 hover:border-primary/50",
                        )}
                      >
                        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <IconCamera className="size-6" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-foreground">
                            Upload Receipt Photo
                          </span>
                          <span className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                            Take a photo or upload receipt image to extract
                            items automatically
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                // === Manual Prompt Layout ===
                <>
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
                      Prepare the receipt photo or image on your device.
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
                      Click the button above to copy the prompt, send it to
                      ChatGPT/Gemini/Claude with your receipt image.
                    </p>
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
                </>
              )}
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
                disabled={isAiParsing}
              >
                Cancel
              </Button>
              {aiImportMode === "manual" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleImportByAi}
                  className="rounded-xl h-9 text-xs min-w-[90px]"
                >
                  Import Items
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
