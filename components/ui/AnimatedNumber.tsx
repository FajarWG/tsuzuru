"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  animateOnMount?: boolean;
}

export default function AnimatedNumber({
  value,
  formatFn = (val) => val.toLocaleString(),
  className,
  animateOnMount = false,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isMounted = useRef(false);

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
          ref.current.textContent = formatFn(value);
        }
        return;
      }
    }

    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: [0.25, 1, 0.5, 1], // easeOutQuart
    });
    return () => controls.stop();
  }, [value, motionValue, animateOnMount, formatFn]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatFn(latest);
      }
    });
    return () => unsubscribe();
  }, [springValue, formatFn]);

  return (
    <span ref={ref} className={className}>
      {formatFn(animateOnMount ? 0 : value)}
    </span>
  );
}
