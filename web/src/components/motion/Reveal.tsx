"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "transition"> {
  /** Entrance offset direction. */
  from?: Direction;
  /** Delay in seconds (use for staggered sequences). */
  delay?: number;
  /** Travel distance in px. */
  distance?: number;
  /** Animate on scroll into view rather than on mount. */
  whenInView?: boolean;
}

const offsets: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
  none: {},
};

/**
 * Entrance reveal primitive (fade + optional slide). Respects
 * `prefers-reduced-motion` by snapping straight to the visible state.
 */
export function Reveal({
  from = "up",
  delay = 0,
  distance = 12,
  whenInView = false,
  children,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();
  const o = offsets[from];

  const hidden = reduce
    ? { opacity: 0 }
    : {
        opacity: 0,
        x: (o.x ?? 0) * distance,
        y: (o.y ?? 0) * distance,
      };
  const visible = { opacity: 1, x: 0, y: 0 };

  const animationProps = whenInView
    ? { whileInView: visible, viewport: { once: true, margin: "-40px" } as const }
    : { animate: visible };

  return (
    <motion.div
      initial={hidden}
      {...animationProps}
      transition={{ duration: reduce ? 0 : 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
