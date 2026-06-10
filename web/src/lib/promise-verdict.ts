import type { PromiseScore } from "@/types";
import type { VerdictTone } from "@/components/motion";
import type { ShareCardLine } from "@/components/share";

/**
 * Single source of truth for mapping the marts' `evidence_direction` into the
 * coarse kept/broke/mixed buckets the viral loops present. The scoring itself
 * lives in the marts — this only collapses the seven directions into the
 * citizen-facing verdict used by receipts, duels and scorecards.
 */

export type VerdictStatus = ShareCardLine["status"]; // "kept" | "broke" | "mixed" | "neutral"

export function verdictStatus(
  direction: PromiseScore["evidence_direction"],
  hasContradiction = false,
): VerdictStatus {
  if (hasContradiction || direction === "contradictory") return "mixed";
  switch (direction) {
    case "implemented":
    case "partial":
    case "championed":
    case "supported":
      return "kept";
    case "opposed":
      return "broke";
    case "unclear":
    default:
      return "neutral";
  }
}

export function statusTone(status: VerdictStatus): VerdictTone {
  switch (status) {
    case "kept":
      return "positive";
    case "broke":
      return "negative";
    case "mixed":
      return "warning";
    case "neutral":
    default:
      return "neutral";
  }
}

const STATUS_WORDS: Record<VerdictStatus, string> = {
  kept: "Höll",
  broke: "Bröt",
  mixed: "Blandat",
  neutral: "Oklart",
};

export function statusWord(status: VerdictStatus): string {
  return STATUS_WORDS[status];
}
