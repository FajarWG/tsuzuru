"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconAlertTriangle, IconHome } from "@tabler/icons-react";

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-background min-h-[80vh]">
      <div className="max-w-[380px] w-full flex flex-col items-center gap-6 p-8 rounded-3xl border border-border/40 bg-card shadow-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Warning Icon with a soft pulsing background */}
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center animate-pulse">
          <IconAlertTriangle className="size-8" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Oops... Halaman Tidak Ditemukan!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Halaman yang Anda cari tidak tersedia, telah dipindahkan, atau belum dibuat.
          </p>
        </div>

        {/* Countdown details */}
        <div className="py-3 px-4 rounded-2xl bg-muted/50 border border-border/20 w-full">
          <p className="text-xs text-muted-foreground">
            Mengarahkan kembali ke Beranda dalam{" "}
            <span className="font-bold text-primary text-sm inline-block min-w-[12px] animate-bounce">
              {countdown}
            </span>{" "}
            detik...
          </p>
        </div>

        {/* Redirect button */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <Button
            onClick={() => router.push("/")}
            className="w-full h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <IconHome className="size-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
