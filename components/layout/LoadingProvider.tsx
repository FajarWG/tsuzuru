"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "./LoadingScreen";

interface LoadingProviderProps {
  children: React.ReactNode;
}

export default function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if the loading screen has already been shown in this browser session
    try {
      const hasLoaded = sessionStorage.getItem("tsuzuru_loaded");
      if (hasLoaded === "true") {
        setIsLoading(false);
      }
    } catch (e) {
      console.warn("sessionStorage is not accessible:", e);
      setIsLoading(false); // Fallback: disable loading screen if storage is blocked
    }
  }, []);

  const handleFinished = () => {
    setIsLoading(false);
    try {
      sessionStorage.setItem("tsuzuru_loaded", "true");
    } catch (e) {
      console.warn("Could not save load state to sessionStorage:", e);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {mounted && isLoading && (
          <LoadingScreen key="loading-screen" onFinished={handleFinished} />
        )}
      </AnimatePresence>
      <div
        className={
          mounted && isLoading
            ? "pointer-events-none overflow-hidden h-screen select-none"
            : ""
        }
      >
        {children}
      </div>
    </>
  );
}
