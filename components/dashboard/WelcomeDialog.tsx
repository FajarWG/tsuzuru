"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLoader,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconCoins,
  IconWallet,
  IconArrowRight,
  IconActivity,
  IconBuildingBank,
  IconCreditCard,
  IconConfetti,
  IconInfoCircle,
  IconPlus,
  IconTrash,
  IconBulb,
  IconX,
} from "@tabler/icons-react";
import { completeOnboardingAction } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";
import { formatInputAmount, parseInputAmount } from "@/lib/format";

interface WelcomeDialogProps {
  isOnboarded: boolean;
  userId: string;
}

interface AccountOnboardingItem {
  name: string;
  type: string;
  balance: string;
  checked: boolean;
}

interface TemplateOnboardingItem {
  name: string;
  amount: string;
  accountName: string;
  checked: boolean;
}

interface RecommendationItem {
  name: string;
  type: string;
  defaultBalance: string;
}

const JPY_RECS: RecommendationItem[] = [
  { name: "Yucho Bank", type: "bank", defaultBalance: "100,000" },
  { name: "PayPay", type: "ewallet", defaultBalance: "20,000" },
  { name: "PayPay Investasi", type: "investment", defaultBalance: "50,000" },
];

const IDR_RECS: RecommendationItem[] = [
  { name: "Jago", type: "bank", defaultBalance: "5,000,000" },
  { name: "Mandiri", type: "bank", defaultBalance: "2,000,000" },
  { name: "Cash/E-Wallet", type: "ewallet", defaultBalance: "500,000" },
];

const JPY_DEFAULT_TEMPLATES: TemplateOnboardingItem[] = [
  {
    name: "Apato (家賃)",
    amount: "55,000",
    accountName: "Yucho Bank",
    checked: true,
  },
  {
    name: "Listrik (電気)",
    amount: "6,000",
    accountName: "PayPay",
    checked: true,
  },
  { name: "Air (水道)", amount: "3,000", accountName: "PayPay", checked: true },
  { name: "Gas (ガス)", amount: "4,000", accountName: "PayPay", checked: true },
  { name: "SimCard", amount: "2,500", accountName: "PayPay", checked: true },
];

const IDR_DEFAULT_TEMPLATES: TemplateOnboardingItem[] = [
  { name: "Kost", amount: "1,500,000", accountName: "Jago", checked: true },
  {
    name: "Internet/WiFi",
    amount: "400,000",
    accountName: "Jago",
    checked: true,
  },
  { name: "Air", amount: "100,000", accountName: "Jago", checked: true },
  {
    name: "Listrik",
    amount: "300,000",
    accountName: "Cash/E-Wallet",
    checked: true,
  },
  {
    name: "SIM Card",
    amount: "100,000",
    accountName: "Cash/E-Wallet",
    checked: true,
  },
];

export default function WelcomeDialog({
  isOnboarded,
  userId,
}: WelcomeDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Configuration States
  const [currency, setCurrency] = useState<"JPY" | "IDR">("JPY");
  const budgetCurrencySymbol = currency === "JPY" ? "¥" : "Rp";
  const budgetCurrencyPadding = currency === "JPY" ? "pl-7" : "pl-9";

  const formatCurrency = (amount: number, curr: string) => {
    return curr === "JPY"
      ? `¥${Number(amount).toLocaleString()}`
      : `Rp${Number(amount).toLocaleString("id-ID")}`;
  };

  const [accounts, setAccounts] = useState<AccountOnboardingItem[]>([]);
  const [templates, setTemplates] = useState<TemplateOnboardingItem[]>([]);

  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [pocketMoneyLimit, setPocketMoneyLimit] = useState("");
  const [shoppingLimit, setShoppingLimit] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Inline Sub-dialog Overlay States
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("bank");
  const [newAccountBalance, setNewAccountBalance] = useState("0");

  const [showSelectRecommendations, setShowSelectRecommendations] =
    useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<
    string[]
  >([]);

  const [showAddBill, setShowAddBill] = useState(false);
  const [newBillName, setNewBillName] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("0");
  const [newBillAccount, setNewBillAccount] = useState("");

  const [showSelectBillRecommendations, setShowSelectBillRecommendations] =
    useState(false);
  const [selectedBillRecommendations, setSelectedBillRecommendations] =
    useState<string[]>([]);

  const [showBudgetTips, setShowBudgetTips] = useState(false);
  const [showRecommendationCalculator, setShowRecommendationCalculator] =
    useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  const [savingsType, setSavingsType] = useState<"percentage" | "nominal">(
    "percentage",
  );
  const [savingsValue, setSavingsValue] = useState("20");

  useEffect(() => {
    if (!isOnboarded) {
      setIsOpen(true);
      applyDefaults("JPY");
    }
  }, [isOnboarded]);

  const applyDefaults = (curr: "JPY" | "IDR") => {
    setAccounts([]); // starts empty!
    setTemplates([]); // starts empty!
    setMonthlyBudget(""); // starts empty!
    setPocketMoneyLimit(""); // starts empty!
    setShoppingLimit(""); // starts empty!
  };

  const handleStartSetupLoading = () => {
    setStep(5);
    setIsSettingUp(true);
    setTimeout(() => {
      setIsSettingUp(false);
    }, 3000);
  };

  const handleCurrencyChange = (newCurr: "JPY" | "IDR") => {
    setCurrency(newCurr);
    applyDefaults(newCurr);
  };

  // Accounts Handlers
  const handleAccountCheck = (index: number, checked: boolean) => {
    const updated = [...accounts];
    updated[index].checked = checked;
    setAccounts(updated);
  };

  const handleAccountBalanceChange = (index: number, value: string) => {
    const updated = [...accounts];
    updated[index].balance = formatInputAmount(value);
    setAccounts(updated);
  };

  const handleRemoveAccount = (index: number) => {
    const nameToRemove = accounts[index].name;
    setAccounts(accounts.filter((_, i) => i !== index));
    setTemplates(templates.filter((t) => t.accountName !== nameToRemove));
  };

  const handleAddAccountClick = () => {
    setNewAccountName("");
    setNewAccountType("bank");
    setNewAccountBalance("0");
    setShowAddAccount(true);
  };

  const handleAddAccountSubmit = () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) return;
    if (accounts.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("An account with this name already exists");
      return;
    }
    setAccounts([
      ...accounts,
      {
        name: trimmed,
        type: newAccountType,
        balance:
          newAccountType === "credit_card"
            ? "0"
            : formatInputAmount(newAccountBalance),
        checked: true,
      },
    ]);
    setShowAddAccount(false);
    toast.success(`Custom account "${trimmed}" added!`);
  };

  // Select Recommendation Handlers
  const handleSelectRecommendationsClick = () => {
    const currentRecNames = accounts.map((a) => a.name);
    const defaults = currency === "JPY" ? JPY_RECS : IDR_RECS;
    const selected = defaults
      .filter((d) => currentRecNames.includes(d.name))
      .map((d) => d.name);
    setSelectedRecommendations(selected);
    setShowSelectRecommendations(true);
  };

  const handleToggleRecommendation = (name: string) => {
    if (selectedRecommendations.includes(name)) {
      setSelectedRecommendations(
        selectedRecommendations.filter((n) => n !== name),
      );
    } else {
      setSelectedRecommendations([...selectedRecommendations, name]);
    }
  };

  const handleAddRecommendationsSubmit = () => {
    const recsToUse = currency === "JPY" ? JPY_RECS : IDR_RECS;
    const customAccounts = accounts.filter((a) => {
      const isRecommendation = recsToUse.some((r) => r.name === a.name);
      return !isRecommendation;
    });

    const selectedRecItems: AccountOnboardingItem[] = [];
    for (const name of selectedRecommendations) {
      const recItem = recsToUse.find((r) => r.name === name);
      if (recItem) {
        const existing = accounts.find((a) => a.name === name);
        selectedRecItems.push({
          name: recItem.name,
          type: recItem.type,
          balance: existing ? existing.balance : recItem.defaultBalance,
          checked: true,
        });
      }
    }

    setAccounts([...customAccounts, ...selectedRecItems]);
    setShowSelectRecommendations(false);
    toast.success("Accounts selection updated!");
  };

  // Templates Handlers
  const handleTemplateCheck = (index: number, checked: boolean) => {
    const updated = [...templates];
    updated[index].checked = checked;
    setTemplates(updated);
  };

  const handleTemplateAmountChange = (index: number, value: string) => {
    const updated = [...templates];
    updated[index].amount = formatInputAmount(value);
    setTemplates(updated);
  };

  const handleRemoveTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const handleAddBillClick = () => {
    const checkedAccs = accounts.filter((a) => a.checked);
    if (checkedAccs.length === 0) {
      toast.error(
        "Please add and select at least one active financial account first",
      );
      return;
    }
    setNewBillName("");
    setNewBillAmount("0");
    setNewBillAccount(checkedAccs[0].name);
    setShowAddBill(true);
  };

  const handleAddBillSubmit = () => {
    const trimmed = newBillName.trim();
    if (!trimmed) return;
    if (templates.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A bill template with this name already exists");
      return;
    }
    setTemplates([
      ...templates,
      {
        name: trimmed,
        amount: formatInputAmount(newBillAmount),
        accountName: newBillAccount,
        checked: true,
      },
    ]);
    setShowAddBill(false);
    toast.success(`Custom bill template "${trimmed}" added!`);
  };

  // Select Bill Recommendations Handlers
  const handleSelectBillRecommendationsClick = () => {
    const currentBillNames = templates.map((t) => t.name);
    const defaults =
      currency === "JPY" ? JPY_DEFAULT_TEMPLATES : IDR_DEFAULT_TEMPLATES;
    const selected = defaults
      .filter((d) => currentBillNames.includes(d.name))
      .map((d) => d.name);
    setSelectedBillRecommendations(selected);
    setShowSelectBillRecommendations(true);
  };

  const handleToggleBillRecommendation = (name: string) => {
    if (selectedBillRecommendations.includes(name)) {
      setSelectedBillRecommendations(
        selectedBillRecommendations.filter((n) => n !== name),
      );
    } else {
      setSelectedBillRecommendations([...selectedBillRecommendations, name]);
    }
  };

  const handleAddBillRecommendationsSubmit = () => {
    const recsToUse =
      currency === "JPY" ? JPY_DEFAULT_TEMPLATES : IDR_DEFAULT_TEMPLATES;
    const customBills = templates.filter((t) => {
      const isRecommendation = recsToUse.some((r) => r.name === t.name);
      return !isRecommendation;
    });

    const activeAccNames = accounts.filter((a) => a.checked).map((a) => a.name);
    const fallbackAccount = activeAccNames[0] || "";

    const selectedBillItems: TemplateOnboardingItem[] = [];
    for (const name of selectedBillRecommendations) {
      const recItem = recsToUse.find((r) => r.name === name);
      if (recItem) {
        const isLinkedActive = activeAccNames.includes(recItem.accountName);
        const existing = templates.find((t) => t.name === name);
        selectedBillItems.push({
          name: recItem.name,
          amount: existing ? existing.amount : recItem.amount,
          accountName: isLinkedActive ? recItem.accountName : fallbackAccount,
          checked: true,
        });
      }
    }

    setTemplates([...customBills, ...selectedBillItems]);
    setShowSelectBillRecommendations(false);
    toast.success("Bill templates selection updated!");
  };

  const handleApplyOnboardingRecommendation = () => {
    const salaryVal = parseInputAmount(salaryInput);
    if (isNaN(salaryVal) || salaryVal <= 0) {
      toast.error("Please enter a valid salary amount");
      return;
    }

    let recSavings = 0;
    if (savingsType === "percentage") {
      const pct = parseFloat(savingsValue) || 0;
      const cappedPct = Math.min(Math.max(pct, 0), 100);
      recSavings = Math.round(salaryVal * (cappedPct / 100));
    } else {
      const nominal = parseInputAmount(savingsValue) || 0;
      recSavings = Math.min(Math.max(nominal, 0), salaryVal);
    }

    const rem = salaryVal - recSavings;
    let monthlyRec = 0;
    let pocketRec = 0;
    let shoppingRec = 0;

    if (rem >= salaryVal * 0.5) {
      monthlyRec = Math.round(salaryVal * 0.5);
      const wants = rem - monthlyRec;
      pocketRec = Math.round(wants * (2 / 3));
      shoppingRec = Math.round(wants * (1 / 3));
    } else {
      monthlyRec = Math.max(rem, 0);
      pocketRec = 0;
      shoppingRec = 0;
    }

    setMonthlyBudget(formatInputAmount(monthlyRec.toString()));
    setPocketMoneyLimit(formatInputAmount(pocketRec.toString()));
    setShoppingLimit(formatInputAmount(shoppingRec.toString()));

    toast.success("Recommended budget limits calculated and applied!");
    setShowRecommendationCalculator(false);
    setSalaryInput("");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Checked accounts
    const activeAccounts = accounts
      .filter((a) => a.checked)
      .map((a) => ({
        name: a.name,
        type: a.type,
        balance: parseInputAmount(a.balance),
      }));

    // Checked templates
    const fallbackAccount = activeAccounts[0]?.name || "";
    const activeTemplates = templates
      .filter((t) => t.checked)
      .map((t) => {
        const isLinkedActive = activeAccounts.some(
          (a) => a.name === t.accountName,
        );
        return {
          name: t.name,
          amount: parseInputAmount(t.amount),
          accountName: isLinkedActive ? t.accountName : fallbackAccount,
        };
      });

    try {
      const result = await completeOnboardingAction({
        userId,
        currency,
        monthlyBudget: parseInputAmount(monthlyBudget),
        pocketMoneyLimit: parseInputAmount(pocketMoneyLimit),
        shoppingLimit: parseInputAmount(shoppingLimit),
        accounts: activeAccounts,
        templates: activeTemplates,
      });

      if (result.success) {
        toast.success("Workspace setup completed successfully!");
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to finalize onboarding setup");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        "An unexpected error occurred during onboarding finalization",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
    if (type === "investment")
      return (
        <IconActivity className="size-4 text-emerald-600 dark:text-emerald-400" />
      );
    if (type === "credit_card")
      return (
        <IconCreditCard className="size-4 text-rose-500 dark:text-rose-400" />
      );
    if (type === "ewallet")
      return (
        <IconWallet className="size-4 text-amber-500 dark:text-amber-400" />
      );
    return (
      <IconBuildingBank className="size-4 text-blue-500 dark:text-blue-400" />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[430px] rounded-3xl p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex flex-col max-h-[85vh] p-6 relative min-h-[480px]">
          {/* Header Step Counter Indicator */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-sans font-bold tracking-widest text-muted-foreground uppercase">
              Step {step} of 5
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    s === step
                      ? "w-5 bg-primary"
                      : "w-2 bg-muted-foreground/20",
                  )}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <DialogHeader className="gap-1 pb-4 shrink-0 border-b border-border/20 text-center">
                  <DialogTitle className="font-sans text-xl text-primary">
                    ようこそ
                  </DialogTitle>
                  <div className="font-sans text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">
                    Welcome to Tsuzuru
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                    Tsuzuru (綴る) helps you weave your financial story. Let's
                    customize your workspace in a few easy steps to match your
                    profile!
                  </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-4 min-h-0">
                  <div className="grid grid-cols-1 gap-3.5">
                    <div className="flex gap-3 items-start p-3 bg-muted/20 border border-border/20 rounded-2xl">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                        <IconWallet className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          Financial Accounts
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          Setup your daily banks, e-wallets, or cash starting
                          balances.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 bg-muted/20 border border-border/20 rounded-2xl">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                        <IconCoins className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          Monthly Budget Limits
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          Set goals for your general expenses, pocket money, and
                          shopping.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start p-3 bg-muted/20 border border-border/20 rounded-2xl">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                        <IconCheck className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          Recurring Bill Templates
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          Save templates for rent, electricity, or water bills
                          to pay in 1-click.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/20 shrink-0">
                  <Button
                    onClick={() => setStep(2)}
                    className="w-full h-11 rounded-xl font-medium text-xs tracking-wider gap-2 cursor-pointer"
                  >
                    Set up your account <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <DialogHeader className="gap-0.5 pb-2 shrink-0 border-b border-border/20">
                  <DialogTitle className="font-sans text-lg text-primary">
                    Currency & Accounts
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Select your main currency and configure active starting
                    accounts.
                  </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-1 flex flex-col gap-3 min-h-0 max-h-[38vh] pr-1">
                  {/* Currency Toggle */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pl-1">
                      Main Currency
                    </Label>
                    <div className="flex bg-muted p-1 rounded-xl border border-border/10">
                      {(["JPY", "IDR"] as const).map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => handleCurrencyChange(curr)}
                          className={cn(
                            "flex-1 h-9 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer",
                            currency === curr
                              ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {curr === "JPY" ? "JPY (¥)" : "IDR (Rp)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accounts List */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center pl-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Financial Accounts
                      </Label>
                    </div>

                    <div className="flex flex-col gap-2">
                      {accounts.length === 0 ? (
                        <div className="text-center px-4 py-6 border border-dashed border-border rounded-2xl bg-muted/10">
                          <p className="text-[11px] text-muted-foreground font-semibold">
                            No accounts added yet.
                          </p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                            Add custom accounts or select from recommendations
                            below.
                          </p>
                        </div>
                      ) : (
                        accounts.map((acc, index) => (
                          <div
                            key={acc.name}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-2xl transition-all",
                              acc.checked
                                ? "bg-muted/30 border-primary/40"
                                : "bg-transparent border-border opacity-60",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Checkbox
                                checked={acc.checked}
                                onCheckedChange={(checked) =>
                                  handleAccountCheck(index, !!checked)
                                }
                              />
                              <div className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg text-primary border border-border/20 shrink-0">
                                {getAccountIcon(acc.type)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-foreground truncate leading-tight font-sans">
                                  {acc.name}
                                </span>
                                <span className="text-[9px] text-muted-foreground capitalize leading-none font-sans">
                                  {acc.type}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {acc.checked && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    {currency === "JPY" ? "¥" : "Rp"}
                                  </span>
                                  <input
                                    type="text"
                                    value={acc.balance}
                                    onChange={(e) =>
                                      handleAccountBalanceChange(
                                        index,
                                        e.target.value,
                                      )
                                    }
                                    className="w-20 h-7 text-right text-xs bg-white dark:bg-zinc-900 border border-border rounded-lg px-2 focus:outline-none focus:border-primary font-semibold font-sans"
                                  />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAccount(index)}
                                className="p-1 text-zinc-400 hover:text-destructive transition-colors cursor-pointer shrink-0"
                                title="Delete Account"
                              >
                                <IconTrash className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-1.5">
                      {accounts.some((a) =>
                        (currency === "JPY" ? JPY_RECS : IDR_RECS).some(
                          (r) => r.name === a.name,
                        ),
                      ) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAccountClick}
                          className="w-full text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 animate-in fade-in duration-300"
                        >
                          <IconPlus className="size-3.5" /> Add Custom Account
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddAccountClick}
                            className="text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1 px-1.5 min-w-0"
                          >
                            <IconPlus className="size-3.5 shrink-0" />{" "}
                            <span className="truncate">Add Custom</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectRecommendationsClick}
                            className="text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1 px-1.5 min-w-0"
                          >
                            <IconCheck className="size-3.5 shrink-0" />{" "}
                            <span className="truncate">Recommendations</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/20 flex gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-1/3 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    <IconChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!accounts.some((a) => a.checked)}
                    className="flex-1 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    Continue <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <DialogHeader className="gap-0.5 pb-3 shrink-0 border-b border-border/20">
                  <DialogTitle className="font-sans text-lg text-primary">
                    Monthly Budget Limits
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Set up your monthly expected budget limits in {currency}.
                  </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-1 flex flex-col gap-3.5 min-h-0 max-h-[40vh]">
                  {/* Monthly Budget Input */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Monthly Expected Budget
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-muted-foreground">
                        {currency === "JPY" ? "¥" : "Rp"}
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={monthlyBudget}
                        onChange={(e) =>
                          setMonthlyBudget(formatInputAmount(e.target.value))
                        }
                        className={cn(
                          "h-10 font-semibold rounded-xl",
                          currency === "JPY" ? "pl-7" : "pl-9",
                        )}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Limit Dividers */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Living Expenses Limit
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-muted-foreground">
                          {currency === "JPY" ? "¥" : "Rp"}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={pocketMoneyLimit}
                          onChange={(e) =>
                            setPocketMoneyLimit(
                              formatInputAmount(e.target.value),
                            )
                          }
                          className={cn(
                            "h-10 font-semibold rounded-xl",
                            currency === "JPY" ? "pl-7" : "pl-9",
                          )}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Personal Spending Limit
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-muted-foreground">
                          {currency === "JPY" ? "¥" : "Rp"}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={shoppingLimit}
                          onChange={(e) =>
                            setShoppingLimit(formatInputAmount(e.target.value))
                          }
                          className={cn(
                            "h-10 font-semibold rounded-xl",
                            currency === "JPY" ? "pl-7" : "pl-9",
                          )}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBudgetTips(true)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 cursor-pointer mt-1 self-start"
                  >
                    <IconInfoCircle className="size-4 text-primary" /> See
                    Explanation
                  </button>

                  {/* Calculate Recommendation Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSalaryInput("");
                      setSavingsType("percentage");
                      setSavingsValue("20");
                      setShowRecommendationCalculator(true);
                    }}
                    className="w-full text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    <IconActivity className="size-3.5 text-primary" /> Calculate
                    Recommendation
                  </Button>
                </div>

                {/* Subcategory tip */}
                <div className="p-3 bg-primary/5 border border-primary/15 rounded-2xl flex gap-2.5 items-start">
                  <IconInfoCircle className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                    You can customize subcategories (e.g. Groceries, Coffee,
                    Utilities) for each budget later from{" "}
                    <strong>Settings → Budget</strong>.
                  </p>
                </div>

                <div className="pt-4 border-t border-border/20 flex gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="w-1/3 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    <IconChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="flex-1 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    Continue <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <DialogHeader className="gap-0.5 pb-2 shrink-0 border-b border-border/20">
                  <DialogTitle className="font-sans text-lg text-primary">
                    Recurring Bills
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Configure your monthly recurring bills.
                  </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-1 flex flex-col gap-2.5 min-h-0 max-h-[38vh] pr-1">
                  {templates.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border rounded-2xl bg-muted/10">
                      <p className="text-[11px] text-muted-foreground font-semibold">
                        No recurring bills added yet.
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                        Add custom bills or select from recommendations below.
                      </p>
                    </div>
                  ) : (
                    templates.map((tpl, index) => (
                      <div
                        key={tpl.name}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-2xl transition-all",
                          tpl.checked
                            ? "bg-muted/30 border-primary/40"
                            : "bg-transparent border-border opacity-60",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={tpl.checked}
                            onCheckedChange={(checked) =>
                              handleTemplateCheck(index, !!checked)
                            }
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate leading-tight font-sans">
                              {tpl.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground truncate leading-none font-sans">
                              Paid via {tpl.accountName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {tpl.checked && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {currency === "JPY" ? "¥" : "Rp"}
                              </span>
                              <input
                                type="text"
                                value={tpl.amount}
                                onChange={(e) =>
                                  handleTemplateAmountChange(
                                    index,
                                    e.target.value,
                                  )
                                }
                                className="w-18 h-7 text-right text-xs bg-white dark:bg-zinc-900 border border-border rounded-lg px-2 focus:outline-none focus:border-primary font-semibold font-sans"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplate(index)}
                            className="p-1 text-zinc-400 hover:text-destructive transition-colors cursor-pointer shrink-0"
                            title="Delete Bill"
                          >
                            <IconTrash className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Tip banner to fill empty space */}
                  <div className="p-3 bg-primary/5 border border-primary/15 rounded-2xl flex gap-2.5 items-start mt-2">
                    <IconInfoCircle className="size-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[11px] font-bold text-foreground font-sans">
                        Why track recurring bills?
                      </span>
                      <p className="text-[10px] text-muted-foreground leading-normal font-sans">
                        Registering bills (like Rent, Netflix, or Utilities)
                        links them to your active accounts. Every month, you can
                        record payments with a single tap from your dashboard to
                        save time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5">
                  {templates.some((t) =>
                    (currency === "JPY"
                      ? JPY_DEFAULT_TEMPLATES
                      : IDR_DEFAULT_TEMPLATES
                    ).some((r) => r.name === t.name),
                  ) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBillClick}
                      className="w-full text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 animate-in fade-in duration-300"
                    >
                      <IconPlus className="size-3.5" /> Add Custom Bill
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddBillClick}
                        className="text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1 px-1.5 min-w-0"
                      >
                        <IconPlus className="size-3.5 shrink-0" />{" "}
                        <span className="truncate">Add Custom</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectBillRecommendationsClick}
                        className="text-[10px] font-semibold tracking-wide border-dashed border-primary/40 text-primary hover:bg-primary/5 h-9 rounded-xl cursor-pointer flex items-center justify-center gap-1 px-1.5 min-w-0"
                      >
                        <IconCheck className="size-3.5 shrink-0" />{" "}
                        <span className="truncate">Recommendations</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/20 flex gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="w-1/3 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    <IconChevronLeft className="size-4" /> Back
                  </Button>
                  <Button
                    onClick={handleStartSetupLoading}
                    className="flex-1 h-11 rounded-xl font-medium text-xs tracking-wider gap-1.5 cursor-pointer"
                  >
                    Setup Complete <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 text-center py-4 justify-center items-center min-h-[340px] w-full"
              >
                {isSettingUp ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8 animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center">
                      {/* Pulse rings */}
                      <div className="absolute size-16 bg-primary/10 rounded-full animate-ping" />
                      <div className="absolute size-20 bg-primary/5 rounded-full animate-pulse" />
                      <IconLoader className="size-10 text-primary animate-spin" />
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="font-sans text-sm font-bold text-foreground">
                        Setting up your workspace...
                      </span>
                      <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
                        Initializing financial accounts, budgets, and recurring
                        bills.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-center w-full animate-in zoom-in-95 duration-300">
                    {/* SVG Checkmark */}
                    <div className="flex justify-center items-center h-16">
                      <motion.svg
                        className="w-16 h-16 text-emerald-500"
                        viewBox="0 0 52 52"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3.5}
                      >
                        <motion.circle
                          cx={26}
                          cy={26}
                          r={23}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                        />
                        <motion.path
                          d="M16 27 l7 7 l14 -14"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.4,
                            ease: "easeInOut",
                          }}
                        />
                      </motion.svg>
                    </div>

                    <div className="flex flex-col gap-1 mt-2">
                      <h3 className="font-sans text-lg font-bold text-foreground">
                        Workspace Ready!
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                        Your {currency} financial workspace is fully configured
                        and ready for use.
                      </p>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-muted/40 border border-border/20 rounded-2xl p-4 text-left max-w-[320px] mx-auto w-full flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Base Currency:
                        </span>
                        <span className="font-bold text-foreground">
                          {currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Accounts Linked:
                        </span>
                        <span className="font-bold text-foreground font-sans">
                          {accounts.filter((a) => a.checked).length} active
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Monthly Budget:
                        </span>
                        <span className="font-bold text-foreground font-sans">
                          {currency === "JPY" ? "¥" : "Rp"}
                          {monthlyBudget || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Bills Tracked:
                        </span>
                        <span className="font-bold text-foreground font-sans">
                          {templates.filter((t) => t.checked).length} bills
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 w-full shrink-0">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-11 rounded-xl font-medium text-xs tracking-wider gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <IconLoader className="size-4 animate-spin" />{" "}
                            Saving...
                          </>
                        ) : (
                          <>
                            Start Tracking <IconArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sub-dialog absolute overlay for adding custom account */}
          {showAddAccount && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-border/20">
                  <h4 className="text-sm font-bold text-primary font-sans">
                    Add Custom Account
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Account Name
                    </Label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g. BNI, Cash, Pocket Cash"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Account Type
                    </Label>
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="h-9 px-3 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-semibold"
                    >
                      <option value="bank">Bank Account</option>
                      <option value="ewallet">E-Wallet / Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="investment">Investment / Others</option>
                    </select>
                  </div>

                  {newAccountType !== "credit_card" && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Starting Balance
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-muted-foreground">
                          {currency === "JPY" ? "¥" : "Rp"}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={newAccountBalance}
                          onChange={(e) =>
                            setNewAccountBalance(
                              formatInputAmount(e.target.value),
                            )
                          }
                          className={cn(
                            "h-9 font-semibold rounded-xl text-xs",
                            currency === "JPY" ? "pl-7" : "pl-9",
                          )}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleAddAccountSubmit}
                  disabled={!newAccountName.trim()}
                  className="w-full h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer mt-1 font-sans"
                >
                  Add Account
                </Button>
              </div>
            </div>
          )}

          {/* Sub-dialog absolute overlay for selecting recommendations */}
          {showSelectRecommendations && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90%]">
                <div className="flex justify-between items-center pb-2 border-b border-border/20">
                  <h4 className="text-sm font-bold text-primary font-sans">
                    Select Recommendations
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSelectRecommendations(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[9px] text-muted-foreground leading-relaxed -mt-2">
                  Check the default accounts you want to initialize. They will
                  be added with default starting balances.
                </p>

                <div className="flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1 flex">
                  {(currency === "JPY" ? JPY_RECS : IDR_RECS).map((rec) => {
                    const isChecked = selectedRecommendations.includes(
                      rec.name,
                    );
                    return (
                      <div
                        key={rec.name}
                        onClick={() => handleToggleRecommendation(rec.name)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 border rounded-2xl cursor-pointer transition-all select-none",
                          isChecked
                            ? "bg-primary/5 border-primary/40"
                            : "bg-transparent border-border hover:bg-muted/10",
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          className="pointer-events-none"
                        />
                        <div className="p-1.5 bg-white dark:bg-zinc-800 rounded-lg text-primary border border-border/20 shrink-0">
                          {getAccountIcon(rec.type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate leading-tight font-sans">
                            {rec.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground capitalize leading-none mt-0.5 font-sans">
                            {rec.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={handleAddRecommendationsSubmit}
                  className="w-full h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer font-sans"
                >
                  Add Recommendations
                </Button>
              </div>
            </div>
          )}

          {/* Sub-dialog absolute overlay for See Tips & Recommendations */}
          {showBudgetTips && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-3.5 animate-in zoom-in-95 duration-200 max-h-[90%] overflow-y-auto max-w-[360px]">
                <div className="pb-2 border-b border-border/20 flex justify-between items-center shrink-0">
                  <h4 className="text-sm font-bold text-primary font-sans">
                    Monthly Budget Limits
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowBudgetTips(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Close"
                  >
                    <IconX className="size-4 shrink-0" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-muted-foreground mt-0.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground font-sans text-[11px] leading-tight">
                      Monthly Expected Budget
                    </span>
                    <p className="text-[10px] leading-relaxed mt-0.5">
                      Main spending limit for the entire month across all
                      financial accounts. Used to calculate overall remaining
                      balance.
                    </p>
                  </div>

                  <div className="flex flex-col border-t border-border/10 pt-2">
                    <span className="font-bold text-foreground font-sans text-[11px] leading-tight">
                      Living Expenses Limit
                    </span>
                    <p className="text-[10px] leading-relaxed mt-0.5">
                      Budget for essential living costs: groceries, utilities
                      (gas, electricity, water), rent, household supplies, and
                      healthcare.
                    </p>
                  </div>

                  <div className="flex flex-col border-t border-border/10 pt-2">
                    <span className="font-bold text-foreground font-sans text-[11px] leading-tight">
                      Personal Spending Limit
                    </span>
                    <p className="text-[10px] leading-relaxed mt-0.5">
                      Budget for discretionary spending: dining out, coffee,
                      snacks, drinks, shopping, entertainment, and hobbies.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-border/10 pt-2 bg-primary/5 p-2 rounded-xl border border-primary/10 mt-1">
                    <span className="font-bold text-primary font-sans text-[10px] uppercase tracking-wider leading-tight">
                      Adding Custom Limits & Subcategories
                    </span>
                    <p className="text-[10px] leading-relaxed mt-0.5">
                      In addition to these three core budgets, you can freely
                      create custom budget categories. You can also customize
                      the subcategories (e.g. Groceries, Coffee, Utilities) for
                      Living Expenses and Personal Spending from the{" "}
                      <strong>Settings → Budget</strong> page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-dialog absolute overlay for custom budget recommendation calculator */}
          {showRecommendationCalculator && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-w-[360px] max-h-[90%] overflow-hidden">
                <div className="pb-3 border-b border-border/20 shrink-0">
                  <h4 className="text-sm font-bold text-primary font-sans">
                    Budget Recommendation
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                    Calculate recommended budget limits based on your monthly
                    income.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto py-2 pr-1 flex flex-col gap-4 min-h-0">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">
                      Monthly Income / Salary
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                        {budgetCurrencySymbol}
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={salaryInput}
                        onChange={(e) =>
                          setSalaryInput(formatInputAmount(e.target.value))
                        }
                        className={cn(
                          budgetCurrencyPadding,
                          "h-10 font-semibold",
                        )}
                        placeholder="200,000"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">
                      Savings Target Type
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSavingsType("percentage");
                          setSavingsValue("20");
                        }}
                        className={cn(
                          "h-9 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                          savingsType === "percentage"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border hover:text-foreground",
                        )}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSavingsType("nominal");
                          const parsedSalary =
                            parseInputAmount(salaryInput) || 0;
                          setSavingsValue(
                            formatInputAmount(
                              Math.round(parsedSalary * 0.2).toString(),
                            ),
                          );
                        }}
                        className={cn(
                          "h-9 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                          savingsType === "nominal"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border hover:text-foreground",
                        )}
                      >
                        Nominal Amount
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">
                      {savingsType === "percentage"
                        ? "Savings Percentage"
                        : "Savings Amount"}
                    </Label>
                    <div className="relative flex items-center">
                      {savingsType === "percentage" ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={savingsValue}
                            onChange={(e) => setSavingsValue(e.target.value)}
                            className="h-10 font-semibold pr-8"
                            placeholder="20"
                            required
                          />
                          <span className="absolute right-3 text-sm font-bold text-muted-foreground">
                            %
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="absolute left-3 text-sm font-bold text-muted-foreground">
                            {budgetCurrencySymbol}
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={savingsValue}
                            onChange={(e) =>
                              setSavingsValue(formatInputAmount(e.target.value))
                            }
                            className={cn(
                              budgetCurrencyPadding,
                              "h-10 font-semibold",
                            )}
                            placeholder="40,000"
                            required
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {parseInputAmount(salaryInput) > 0 &&
                    (() => {
                      const parsedSalary = parseInputAmount(salaryInput);
                      let parsedSavings = 0;
                      if (savingsType === "percentage") {
                        const pct = parseFloat(savingsValue) || 0;
                        parsedSavings = Math.round(parsedSalary * (pct / 100));
                      } else {
                        parsedSavings = parseInputAmount(savingsValue) || 0;
                      }

                      const rem = parsedSalary - parsedSavings;
                      let recMonthly = 0;
                      let recPocket = 0;
                      let recShopping = 0;

                      if (rem >= parsedSalary * 0.5) {
                        recMonthly = Math.round(parsedSalary * 0.5);
                        const wants = rem - recMonthly;
                        recPocket = Math.round(wants * (2 / 3));
                        recShopping = Math.round(wants * (1 / 3));
                      } else {
                        recMonthly = Math.max(rem, 0);
                        recPocket = 0;
                        recShopping = 0;
                      }

                      const getPercentLabel = (val: number) => {
                        if (!parsedSalary) return "0%";
                        const pct = (val / parsedSalary) * 100;
                        return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`;
                      };

                      return (
                        <div className="flex flex-col gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl mt-1 shrink-0">
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider font-sans">
                            Recommended Allocation:
                          </span>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              Monthly Expected Budget (Needs:{" "}
                              {getPercentLabel(recMonthly)})
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(recMonthly, currency)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              Living Expenses Limit (Wants:{" "}
                              {getPercentLabel(recPocket)})
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(recPocket, currency)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              Personal Spending Limit (Wants:{" "}
                              {getPercentLabel(recShopping)})
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(recShopping, currency)}
                            </span>
                          </div>

                          <div className="h-px bg-border my-1 opacity-50" />

                          <div className="flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                            <span>
                              Target Savings ({getPercentLabel(parsedSavings)})
                            </span>
                            <span>
                              {formatCurrency(parsedSavings, currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                </div>

                <div className="flex gap-2 pt-3 border-t border-border/20 justify-end shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRecommendationCalculator(false)}
                    className="h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer font-sans"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApplyOnboardingRecommendation}
                    disabled={
                      !salaryInput || parseInputAmount(salaryInput) <= 0
                    }
                    className="h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer font-sans"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-dialog absolute overlay for adding custom bill */}
          {showAddBill && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-border/20">
                  <h4 className="text-sm font-bold text-primary">
                    Add Custom Bill
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddBill(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Bill Name
                    </Label>
                    <Input
                      value={newBillName}
                      onChange={(e) => setNewBillName(e.target.value)}
                      placeholder="e.g. Netflix Premium, Spotify, Gym"
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-muted-foreground">
                        {currency === "JPY" ? "¥" : "Rp"}
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={newBillAmount}
                        onChange={(e) =>
                          setNewBillAmount(formatInputAmount(e.target.value))
                        }
                        className={cn(
                          "h-9 font-semibold rounded-xl text-xs",
                          currency === "JPY" ? "pl-7" : "pl-9",
                        )}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Paid From Account
                    </Label>
                    <select
                      value={newBillAccount}
                      onChange={(e) => setNewBillAccount(e.target.value)}
                      className="h-9 px-3 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-semibold"
                    >
                      {accounts
                        .filter((a) => a.checked)
                        .map((acc) => (
                          <option key={acc.name} value={acc.name}>
                            {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddBillSubmit}
                  disabled={!newBillName.trim()}
                  className="w-full h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer mt-1 font-sans"
                >
                  Add Bill Template
                </Button>
              </div>
            </div>
          )}

          {/* Sub-dialog absolute overlay for selecting bill recommendations */}
          {showSelectBillRecommendations && (
            <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-background w-full rounded-2xl p-5 border border-border/80 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90%]">
                <div className="flex justify-between items-center pb-2 border-b border-border/20">
                  <h4 className="text-sm font-bold text-primary font-sans">
                    Select Templates
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSelectBillRecommendations(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed -mt-2">
                  Select pre-configured monthly bill templates to register. They
                  will link to their default accounts with recommended amounts.
                  You can customize them in the main screen later.
                </p>

                <div className="flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1 flex">
                  {(currency === "JPY"
                    ? JPY_DEFAULT_TEMPLATES
                    : IDR_DEFAULT_TEMPLATES
                  ).map((rec) => {
                    const isChecked = selectedBillRecommendations.includes(
                      rec.name,
                    );
                    return (
                      <div
                        key={rec.name}
                        onClick={() => handleToggleBillRecommendation(rec.name)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 border rounded-2xl cursor-pointer transition-all select-none",
                          isChecked
                            ? "bg-primary/5 border-primary/40"
                            : "bg-transparent border-border hover:bg-muted/10",
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          className="pointer-events-none"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate leading-tight font-sans">
                            {rec.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate leading-none mt-0.5 font-sans">
                            Default link: {rec.accountName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={handleAddBillRecommendationsSubmit}
                  className="w-full h-10 rounded-xl font-medium text-xs tracking-wider cursor-pointer font-sans"
                >
                  Add Selected Recommendations
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
