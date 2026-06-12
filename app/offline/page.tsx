"use client";

import { Button } from "@/components/ui/button";
import { IconWifiOff, IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OfflinePage() {
  const router = useRouter();
  const [isReloading, setIsReloading] = useState(false);

  const handleRetry = () => {
    setIsReloading(true);
    // Reload the application by navigating to the home route
    window.location.href = "/";
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-5 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6 animate-pulse">
        <IconWifiOff className="size-8" />
      </div>

      <h1 className="font-serif text-3xl font-bold text-primary mb-3">
        Koneksi Terputus
      </h1>
      
      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed mb-8">
        Anda sedang offline. Beberapa fitur mungkin tidak tersedia, namun Anda tetap dapat memasukkan transaksi baru yang akan disimpan secara lokal.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        <Button onClick={handleRetry} className="w-full h-11 rounded-xl text-sm font-semibold gap-2" disabled={isReloading}>
          <IconRefresh className={`size-4 ${isReloading ? "animate-spin" : ""}`} />
          {isReloading ? "Mencoba Menghubungkan..." : "Coba Lagi"}
        </Button>
        
        <Button variant="outline" onClick={() => router.back()} className="w-full h-11 rounded-xl text-sm font-semibold" disabled={isReloading}>
          Kembali
        </Button>
      </div>
    </div>
  );
}
