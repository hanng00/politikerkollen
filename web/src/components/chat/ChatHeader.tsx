"use client";

import { motion } from "motion/react";

export function ChatHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-center py-6 border-b border-border shrink-0"
    >
      <h1 className="text-lg font-medium tracking-tight text-foreground">
        Politikerkollen
      </h1>
    </motion.header>
  );
}
