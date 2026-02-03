"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { fadeInUp, defaultTransition } from "@/lib/animations";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";

interface ReasoningBlockProps {
  text: string;
}

export function ReasoningBlock({ text }: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={defaultTransition}
    >
      <div className="border border-primary/20 rounded-lg bg-primary/5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2.5 text-sm text-left px-3 py-2.5"
        >
          <BrainIcon className="size-3.5 text-primary/60" />
          <span className="font-medium text-primary/80 text-[13px]">
            Tänker...
          </span>
          <ChevronRightIcon
            className={`size-3.5 text-primary/40 transition-transform duration-200 ml-auto ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
        {isExpanded && (
          <div className="px-3 pb-3 text-xs text-primary/60 leading-relaxed">
            <Streamdown
              className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-sm prose-primary/60"
              plugins={{ code, math }}
            >
              {text}
            </Streamdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
