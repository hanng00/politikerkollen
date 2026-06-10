"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { gradeTextClass, gradeWord, type Grade } from "@/lib/grades";

/**
 * Big A–F grade medallion with a spring pop-in. Reused by the local scorecard
 * and the Wrapped recap. Reduced-motion disables the spring.
 */
export function GradeMedallion({
  grade,
  size = "lg",
  className,
}: {
  grade: Grade;
  size?: "md" | "lg";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const dim = size === "lg" ? "size-28 text-6xl" : "size-16 text-3xl";

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 320, damping: 18 }
      }
      className={cn(
        "flex items-center justify-center rounded-2xl border-2 font-serif font-semibold ring-1 ring-foreground/10",
        "bg-card/60 backdrop-blur",
        dim,
        gradeTextClass(grade),
        className,
      )}
      style={{ borderColor: "currentColor" }}
      aria-label={`Betyg ${grade} – ${gradeWord(grade)}`}
    >
      {grade}
    </motion.div>
  );
}

const VERDICT_STYLES = {
  positive: "bg-success/10 text-success border-success/30",
  negative: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  neutral: "bg-muted text-muted-foreground border-border",
} as const;

export type VerdictTone = keyof typeof VERDICT_STYLES;

/** Verdict pill (kept / broke / mixed). Consistent styling across loops. */
export function VerdictPill({
  tone,
  children,
  className,
}: {
  tone: VerdictTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        VERDICT_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Surface used to frame a "report" (receipt, recap, scorecard). A subtle
 * gradient + ring keeps it cohesive with the app shell.
 */
export function ReportSurface({
  accent,
  children,
  className,
}: {
  /** Optional hex accent rendered as a top bar. */
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card ring-1 ring-foreground/5",
        className,
      )}
    >
      {accent && (
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      )}
      {children}
    </div>
  );
}
