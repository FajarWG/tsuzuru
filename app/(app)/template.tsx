"use client";

import { motion } from "framer-motion";

interface TemplateProps {
  children: React.ReactNode;
}

export default function Template({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.25, 1, 0.5, 1], // easeOutQuart
      }}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
