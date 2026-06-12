"use client";

import { motion } from "framer-motion";

interface TemplateProps {
  children: React.ReactNode;
}

export default function Template({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 1, 0.5, 1], // easeOutQuart
      }}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
