"use client";

import { useState } from "react";
import { processMonthlyTemplatesAction } from "@/lib/actions/templates";
import { formatJPY } from "@/lib/format";
import { IconAlertTriangle, IconSettings, IconLoader, IconCheck } from "@tabler/icons-react";

interface TemplateItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
}

interface MonthlyBillsBannerProps {
  userId: string;
  templates: TemplateItem[];
}

export default function MonthlyBillsBanner({
  userId,
  templates,
}: MonthlyBillsBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    templates.forEach((t) => {
      initial[t.id] = t.amount;
    });
    return initial;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (templates.length === 0) return null;

  const handleAmountChange = (id: string, val: string) => {
    const parsed = parseFloat(val);
    setAmounts((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await processMonthlyTemplatesAction({
        userId,
        templateEdits: amounts,
      });

      if (res.success) {
        setIsDone(true);
        setTimeout(() => {
          setIsOpen(false);
        }, 1500);
      } else {
        setError(res.error || "Failed to process templates");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Dashboard Banner */}
      <div className="w-full bg-secondary/10 border border-secondary/20 rounded-2xl p-4 mb-6 flex flex-col gap-3 shadow-sm">
        <div className="flex gap-3 items-start">
          <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
            <IconAlertTriangle className="size-6 stroke-[1.8]" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-bold text-base text-foreground leading-tight">
              Monthly bills ready to process
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              It's the 1st of the month. Review and deduct your recurring monthly expenses.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full h-10 rounded-xl bg-secondary hover:bg-secondary/90 text-primary-foreground text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <IconSettings className="size-4" />
          Review & Deduct
        </button>
      </div>

      {/* Review Modal Backdrop & Container */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[390px] bg-background border border-border shadow-2xl rounded-3xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div>
              <h2 className="font-serif font-bold text-lg text-primary">
                Monthly Bill Deductions
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Verify the amounts below before recording them in your accounts.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Template Inputs List */}
            <div className="flex flex-col gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-border/40 rounded-xl"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">
                      {template.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Auto-locked to {template.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 w-24">
                    <span className="text-xs text-muted-foreground">
                      {template.currency === "JPY" ? "¥" : "Rp"}
                    </span>
                    <input
                      type="number"
                      value={amounts[template.id] ?? ""}
                      onChange={(e) =>
                        handleAmountChange(template.id, e.target.value)
                      }
                      className="w-full h-8 px-2 border border-border rounded-lg text-xs font-medium text-right focus:outline-none focus:border-primary bg-background"
                      placeholder="0"
                      disabled={isProcessing || isDone}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 h-11 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors cursor-pointer"
                disabled={isProcessing || isDone}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                disabled={isProcessing || isDone}
              >
                {isProcessing ? (
                  <>
                    <IconLoader className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : isDone ? (
                  <>
                    <IconCheck className="size-4" />
                    Processed!
                  </>
                ) : (
                  "Confirm & Deduct"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
