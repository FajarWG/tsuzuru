"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IconHome } from "@tabler/icons-react";

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
    <div className="flex-1 flex flex-col items-center justify-center bg-background select-none p-6 min-h-[90vh]">
      <div className="flex flex-col items-center max-w-[320px] w-full text-center animate-in fade-in duration-300">
        
        {/* Zen Circle (Enso) & 404 */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-6">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background thin circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-muted/40 fill-none"
              strokeWidth="1"
            />
            {/* Animating circle stroke */}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              className="stroke-primary fill-none"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 2.2,
                ease: [0.25, 1, 0.5, 1], // easeOutQuart
              }}
            />
          </svg>

          {/* 404 Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1.5, ease: "easeOut" }}
            className="font-serif text-3xl text-primary font-medium tracking-wider relative z-10"
          >
            404
          </motion.div>
        </div>

        {/* Title: Page Not Found */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
          className="font-serif text-base tracking-[0.2em] text-foreground font-medium mb-2 uppercase"
        >
          Page Not Found
        </motion.div>

        {/* Subtitle / Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.0, duration: 1.2, ease: "easeOut" }}
          className="text-xs text-muted-foreground leading-relaxed mb-6 font-serif max-w-[260px]"
        >
          The page you are looking for doesn&apos;t exist or has been moved.
        </motion.div>

        {/* Countdown details */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
          className="text-[10px] tracking-[0.15em] text-muted-foreground font-serif uppercase mb-6"
        >
          Redirecting to Home in{" "}
          <span className="font-bold text-primary text-xs inline-block min-w-[8px] animate-bounce">
            {countdown}
          </span>{" "}
          seconds
        </motion.div>

        {/* Back to Home Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1.2, ease: "easeOut" }}
          className="w-full max-w-[200px]"
        >
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full h-10 rounded-full text-[10px] uppercase tracking-[0.2em] font-serif font-medium flex items-center justify-center gap-1.5 cursor-pointer bg-transparent hover:bg-muted/10 border-border/60"
          >
            <IconHome className="size-3.5" />
            Home
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
