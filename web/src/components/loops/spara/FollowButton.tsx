"use client";

import { Bell, BellRing, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useFollows, type FollowTarget } from "./useFollows";

interface FollowButtonProps {
  target: FollowTarget;
  className?: string;
  size?: "default" | "lg";
  /** Optional analytics hook. */
  onToggle?: (following: boolean) => void;
}

/**
 * Embeddable follow toggle. Drop onto party/politician pages to wire the
 * Spåra-hen loop into the main funnel. Animated icon swap on toggle.
 */
export function FollowButton({ target, className, size = "lg", onToggle }: FollowButtonProps) {
  const { isFollowing, toggle, hydrated } = useFollows();
  const following = hydrated && isFollowing(target.id);

  return (
    <Button
      type="button"
      variant={following ? "secondary" : "default"}
      size={size}
      className={cn("h-9", className)}
      aria-pressed={following}
      onClick={() => {
        toggle(target);
        onToggle?.(!following);
      }}
    >
      <span className="relative flex size-4 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {following ? (
            <motion.span
              key="on"
              initial={{ scale: 0.4, opacity: 0, filter: "blur(2px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.4, opacity: 0, filter: "blur(2px)" }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <BellRing className="size-4" />
            </motion.span>
          ) : (
            <motion.span
              key="off"
              initial={{ scale: 0.4, opacity: 0, filter: "blur(2px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.4, opacity: 0, filter: "blur(2px)" }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <Bell className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {following ? (
        <span className="inline-flex items-center gap-1">
          Följer <Check className="size-3.5" />
        </span>
      ) : (
        "Spåra"
      )}
    </Button>
  );
}
