"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if the user has opted out of seeing this dialog
    const hideWelcome = localStorage.getItem("tsuzuru_hide_welcome");
    if (hideWelcome !== "true") {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("tsuzuru_hide_welcome", "true");
    }
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && dontShowAgain) {
      localStorage.setItem("tsuzuru_hide_welcome", "true");
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl p-0">
        <div className="flex flex-col max-h-[85vh] p-6">
          <DialogHeader className="gap-1.5 pb-4 shrink-0 border-b border-border/20">
            <DialogTitle className="font-serif text-lg text-primary text-center">
              ようこそ
            </DialogTitle>
            <div className="text-center font-serif text-[10px] text-muted-foreground tracking-widest uppercase -mt-1">
              Welcome to Tsuzuru
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed text-center mt-2">
              We have set up a default Kakeibo (家計簿) workspace with standard accounts, budgets, and bill templates to help you start tracking right away.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-4 flex flex-col gap-3.5 min-h-0">
            {/* Steps List */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <span className="text-[10px] font-sans font-bold">1</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">4 Financial Accounts Configured</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    Includes JPY accounts (Yucho Bank ¥100k, PayPay ¥20k, PayPay Investasi ¥50k) and an IDR account (Jago Rp5M).
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <span className="text-[10px] font-sans font-bold">2</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">Monthly Budget Limits Set</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    A monthly budget of ¥150,000 JPY is set, allocating ¥40,000 for Pocket Money and ¥60,000 for Shopping.
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <span className="text-[10px] font-sans font-bold">3</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">5 Recurring Bill Templates Ready</span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    Rent, Electricity, Water, Gas, and SIM Card templates are ready. Pay them with one click in settings!
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/20 rounded-xl p-3 text-center">
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                💡 Tip: Click the <strong className="text-primary font-bold">+</strong> button in the bottom navigation to log a new expense or income.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 mt-2 shrink-0 pt-4 border-t border-border/20">
            {/* Checkbox for don't show again */}
            <label className="flex items-center gap-2.5 cursor-pointer px-1 justify-center sm:justify-start">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="size-4 rounded border-border accent-primary text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-[11px] font-medium text-muted-foreground select-none">
                Don't show this message again
              </span>
            </label>

            <DialogFooter className="w-full">
              <Button
                onClick={handleClose}
                className="w-full h-10 rounded-xl font-medium text-xs tracking-wider"
              >
                Get Started
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
