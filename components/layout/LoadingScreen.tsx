"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

interface LoadingScreenProps {
  onFinished: () => void;
}

export default function LoadingScreen({ onFinished }: LoadingScreenProps) {
  useEffect(() => {
    // Keep loading screen for 3.2 seconds
    const finishedTimeout = setTimeout(() => {
      onFinished();
    }, 3200);

    return () => clearTimeout(finishedTimeout);
  }, [onFinished]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none"
    >
      <div className="flex flex-col items-center max-w-[280px] w-full px-4 text-center">
        {/* Zen Circle (Enso) & Kanji */}
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

          {/* Kanji: 綴 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1.5, ease: "easeOut" }}
            className="font-serif text-4xl text-primary font-medium tracking-widest relative z-10"
          >
            綴
          </motion.div>
        </div>

        {/* English Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
          className="font-serif text-lg tracking-[0.25em] text-foreground font-medium mb-1 uppercase"
        >
          Tsuzuru
        </motion.div>

        {/* Concept Subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
          className="text-[10px] tracking-[0.15em] text-muted-foreground font-light font-serif"
        >
          お金の物語を綴ろう
        </motion.div>
      </div>
    </motion.div>
  );
}
