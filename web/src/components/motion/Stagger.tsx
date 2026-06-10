"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

/**
 * Stagger container — children using <StaggerItem> reveal in sequence.
 * Reduced-motion collapses the stagger to an instant reveal.
 */
export function Stagger({
  children,
  step = 0.06,
  ...props
}: HTMLMotionProps<"div"> & { step?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduce ? 0 : step },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  distance = 10,
  ...props
}: HTMLMotionProps<"div"> & { distance?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
