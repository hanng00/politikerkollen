"use client";

import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useShareCard, type ShareCardOptions } from "./useShareCard";

interface ShareCardButtonProps extends ShareCardOptions {
  className?: string;
  /** Visible label in the resting state. */
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "lg";
  /** Optional analytics callback fired when the share is invoked. */
  onShare?: () => void;
}

/**
 * Primary share affordance. Generates the PNG and opens the native share sheet
 * (clipboard/download fallback). The label cross-fades to a success/copied
 * confirmation — a deliberate Peak-End moment.
 */
export function ShareCardButton({
  className,
  label = "Dela",
  variant = "default",
  size = "lg",
  onShare,
  ...options
}: ShareCardButtonProps) {
  const { status, share } = useShareCard();

  const busy = status === "preparing";
  const done = status === "shared" || status === "copied";

  const content =
    status === "preparing" ? (
      <motion.span
        key="preparing"
        className="inline-flex items-center gap-2"
        initial={{ opacity: 0, filter: "blur(2px)", y: 4 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(2px)", y: -4 }}
        transition={{ duration: 0.15 }}
      >
        <Loader2 className="size-4 animate-spin" />
        Skapar kort…
      </motion.span>
    ) : status === "shared" ? (
      <motion.span
        key="shared"
        className="inline-flex items-center gap-2"
        initial={{ opacity: 0, filter: "blur(2px)", y: 4 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(2px)", y: -4 }}
        transition={{ duration: 0.15 }}
      >
        <Check className="size-4" />
        Delat!
      </motion.span>
    ) : status === "copied" ? (
      <motion.span
        key="copied"
        className="inline-flex items-center gap-2"
        initial={{ opacity: 0, filter: "blur(2px)", y: 4 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(2px)", y: -4 }}
        transition={{ duration: 0.15 }}
      >
        <Copy className="size-4" />
        Länk kopierad — bild nedladdad
      </motion.span>
    ) : (
      <motion.span
        key="idle"
        className="inline-flex items-center gap-2"
        initial={{ opacity: 0, filter: "blur(2px)", y: 4 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        exit={{ opacity: 0, filter: "blur(2px)", y: -4 }}
        transition={{ duration: 0.15 }}
      >
        <Share2 className="size-4" />
        {label}
      </motion.span>
    );

  return (
    <Button
      type="button"
      variant={done ? "secondary" : variant}
      size={size}
      disabled={busy}
      className={cn("h-10 px-4", className)}
      onClick={() => {
        onShare?.();
        void share(options);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>
    </Button>
  );
}
