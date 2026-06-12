"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconCloudOff } from "@tabler/icons-react";

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-destructive-foreground text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md pointer-events-auto border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <IconCloudOff className="size-3.5" />
            <span>Mode Offline</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
