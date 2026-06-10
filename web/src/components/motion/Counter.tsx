"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface CounterProps {
  value: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Decimal places to render. */
  decimals?: number;
  /** Thousands separator (Swedish uses a thin/regular space). */
  separator?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumber(
  value: number,
  decimals: number,
  separator: string,
): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart ? `${grouped},${decPart}` : grouped;
}

/**
 * Count-up number with a smooth ease-out tween. Re-animates from the previous
 * value whenever `value` changes (so live increments feel alive). Respects
 * reduced-motion by snapping to the final value.
 */
export function Counter({
  value,
  duration = 1.1,
  decimals = 0,
  separator = "\u00A0",
  prefix = "",
  suffix = "",
  className,
}: CounterProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) return; // reduced motion: render the final value directly
    const controls = animate(fromRef.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  const shown = reduce ? value : display;

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatNumber(shown, decimals, separator)}
      {suffix}
    </span>
  );
}
