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
    <div className="flex-1 flex flex-col items-center justify-center p-5 text-center bg-background min-h-[80vh]">
      <div className="max-w-[360px] w-full flex flex-col items-center gap-5 p-6 rounded-2xl border border-border/40 bg-white dark:bg-zinc-900 shadow-sm animate-in fade-in zoom-in-95 duration-300">
        {/* Warning Icon with a soft pulsing background */}
        <div className="size-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center animate-pulse">
          <IconAlertTriangle className="size-7" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Oops... Page Not Found!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The page you are looking for doesn&apos;t exist, has been moved, or hasn&apos;t been created yet.
          </p>
        </div>

        {/* Countdown details */}
        <div className="py-2.5 px-4 rounded-xl bg-muted/30 border border-border/30 w-full">
          <p className="text-[11px] text-muted-foreground">
            Redirecting you to the Home page in{" "}
            <span className="font-bold text-primary text-xs inline-block min-w-[10px] animate-bounce">
              {countdown}
            </span>{" "}
            seconds...
          </p>
        </div>

        {/* Redirect button */}
        <div className="flex flex-col gap-2 w-full mt-1">
          <Button
            onClick={() => router.push("/")}
            className="w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <IconHome className="size-4" />
            Go back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
