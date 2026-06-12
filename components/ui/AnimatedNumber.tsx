"use client";

import { useEffect, useRef, useMemo } from "react";
import { useMotionValue, useSpring, animate } from "framer-motion";
import { formatJPY, formatIDR } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  currency?: string; // e.g. "JPY" or "IDR"
  formatFn?: (val: number) => string;
  className?: string;
  animateOnMount?: boolean;
}

export default function AnimatedNumber({
  value,
  currency,
  formatFn,
  className,
  animateOnMount = false,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isMounted = useRef(false);

  // Resolve formatting function (fallback to normal locale string if not specified)
  const resolvedFormatFn = useMemo(() => {
    return formatFn || (
      currency === "JPY" ? formatJPY :
      currency === "IDR" ? formatIDR :
      (val: number) => val.toLocaleString()
    );
  }, [formatFn, currency]);

  // Initialize the motion value
  const motionValue = useMotionValue(animateOnMount ? 0 : value);

  // Smooth physics-based spring animation
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 150,
    mass: 0.8,
  });

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      if (!animateOnMount) {
        if (ref.current) {
          ref.current.textContent = resolvedFormatFn(value);
        }
        return;
      }
    }

    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: [0.25, 1, 0.5, 1], // easeOutQuart
    });
    return () => controls.stop();
  }, [value, motionValue, animateOnMount, resolvedFormatFn]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = resolvedFormatFn(latest);
      }
    });
    return () => unsubscribe();
  }, [springValue, resolvedFormatFn]);

  return (
    <span ref={ref} className={className}>
      {resolvedFormatFn(animateOnMount ? 0 : value)}
    </span>
  );
}
