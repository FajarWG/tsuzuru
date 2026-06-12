"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTransactionAction } from "@/lib/actions/transactions";

export default function PwaRegister() {
  const router = useRouter();

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("[PWA] Service Worker registration failed:", error);
          });
      });
    }

    // 2. Background Synchronization logic
    const syncOfflineTransactions = async () => {
      const stored = localStorage.getItem("tsuzuru_offline_transactions");
      if (!stored) return;

      try {
        const transactions = JSON.parse(stored);
        if (!Array.isArray(transactions) || transactions.length === 0) return;

        const toastId = toast.loading(
          `Menyinkronkan ${transactions.length} transaksi offline...`
        );

        let successCount = 0;
        const failedTransactions = [];

        for (const tx of transactions) {
          try {
            // Convert date back to Date object
            const txData = {
              ...tx,
              date: tx.date ? new Date(tx.date) : new Date(),
            };

            const result = await createTransactionAction(txData);
            if (result.success) {
              successCount++;
            } else {
              console.error("[Sync] Action failed for transaction:", result.error);
              failedTransactions.push(tx);
            }
          } catch (err) {
            console.error("[Sync] Network error for transaction:", err);
            failedTransactions.push(tx);
          }
        }

        if (successCount > 0) {
          toast.success(
            `Sinkronisasi berhasil: ${successCount} transaksi disimpan ke server!`,
            { id: toastId }
          );
          router.refresh();
        } else {
          toast.dismiss(toastId);
        }

        if (failedTransactions.length > 0) {
          localStorage.setItem(
            "tsuzuru_offline_transactions",
            JSON.stringify(failedTransactions)
          );
          toast.error(
            `Gagal menyinkronkan ${failedTransactions.length} transaksi. Akan dicoba kembali nanti.`
          );
        } else {
          localStorage.removeItem("tsuzuru_offline_transactions");
        }
      } catch (err) {
        console.error("[Sync] Error parsing offline transactions:", err);
      }
    };

    // Listen to network status changes
    const handleOnline = () => {
      console.log("[PWA] Network status: Online. Starting sync.");
      syncOfflineTransactions();
    };

    const handleOffline = () => {
      console.log("[PWA] Network status: Offline.");
      toast.warning("Koneksi terputus. Anda bekerja dalam mode offline.", {
        duration: 4000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      syncOfflineTransactions();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  return null;
}
