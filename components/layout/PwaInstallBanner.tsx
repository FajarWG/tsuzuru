"use client";

import { useEffect, useState } from "react";
import { IconX, IconShare, IconSquarePlus } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallBanner() {
  const [isMounted, setIsMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Check if previously dismissed
    const isDismissed =
      localStorage.getItem("tsuzuru_pwa_dismissed") === "true";

    if (isStandalone || isDismissed) return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const detectIOS = /ipad|iphone|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(detectIOS);

    if (detectIOS) {
      // For iOS, since beforeinstallprompt isn't supported, we show the banner directly
      setShowBanner(true);
    } else {
      // For Android / other installable platforms
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowBanner(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    // Show browser install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice outcome: ${outcome}`);

    // Regardless of choice, we clear the prompt event and hide banner
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("tsuzuru_pwa_dismissed", "true");
    setShowBanner(false);
  };

  if (!isMounted || !showBanner) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 z-45 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-bottom-5 duration-300"
        style={{
          bottom: "calc(72px + 1.7rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="w-fit pointer-events-auto bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-400/15 text-emerald-950 dark:text-emerald-100 backdrop-blur-md rounded-xl py-2 px-3 flex items-center justify-between gap-2.5 text-xs shadow-xs">
          <p className="font-medium pr-1">
            Get{" "}
            <button
              onClick={handleInstallClick}
              className="font-semibold underline hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
            >
              Tsuzuru
            </button>{" "}
            on your device
          </p>

          <button
            onClick={handleDismiss}
            className="text-emerald-700/60 hover:text-emerald-900 dark:text-emerald-400/60 dark:hover:text-emerald-200 transition-colors cursor-pointer p-0.5 shrink-0"
            aria-label="Close banner"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent className="max-w-[340px] rounded-2xl p-5 border border-border/40 bg-card text-card-foreground">
          <DialogHeader className="text-center pb-2 border-b border-border/20">
            <DialogTitle className="text-base text-primary font-sans">
              Install Tsuzuru
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
              Follow these simple steps to add Tsuzuru to your home screen.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col gap-3.5 text-xs font-sans">
            <div className="flex gap-3 items-start">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-[10px]">
                1
              </div>
              <div className="leading-relaxed">
                Tap the **Share** button{" "}
                <IconShare className="inline size-4 text-primary align-text-bottom mx-0.5" />{" "}
                in Safari.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-[10px]">
                2
              </div>
              <div className="leading-relaxed">
                Scroll down and tap **Add to Home Screen**{" "}
                <IconSquarePlus className="inline size-4 text-primary align-text-bottom mx-0.5" />
                .
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-[10px]">
                3
              </div>
              <div className="leading-relaxed">
                Tap **Add** in the top right corner to complete.
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/20 flex flex-row justify-center">
            <Button
              onClick={() => setShowIosInstructions(false)}
              className="w-full h-9 rounded-xl font-semibold text-xs tracking-wider cursor-pointer"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
