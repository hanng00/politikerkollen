"use client";

import { motion } from "motion/react";
import { Spinner } from "@/components/ui/spinner";
import { fadeInUp, defaultTransition } from "@/lib/animations";

interface ToolLoadingProps {
  message: string;
}

export function ToolLoading({ message }: ToolLoadingProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={defaultTransition}
      className="flex items-center gap-2.5 text-[13px] text-muted-foreground/70"
    >
      <Spinner className="size-3.5" />
      <span>{message}</span>
    </motion.div>
  );
}
