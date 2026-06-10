"use client";

import { useMemo } from "react";

import { FIXTURE_PROMISES } from "@/components/loops/_fixtures/promises";
import {
  usePartyEvidenceScorecard,
  usePromiseScores,
} from "@/hooks/useAccountability";
import { verdictStatus } from "@/lib/promise-verdict";
import type { PromiseScore } from "@/types";

export interface BrokenFeedItem {
  id: string;
  party: string;
  text: string;
  status: "broke" | "mixed";
  label: string;
}

export interface BrokenPromisesData {
  /** Total broken (opposed) promises across all parties. */
  brokeTotal: number;
  /** Total contradictory ("blandat") promises. */
  mixedTotal: number;
  /** Most recent broken/contradictory promises (the "ticks"). */
  feed: BrokenFeedItem[];
  /** True while live data is still loading (counter starts from real base). */
  isLoading: boolean;
  /** True when showing fallback fixtures rather than live data. */
  isFallback: boolean;
}

function toFeed(promises: PromiseScore[]): BrokenFeedItem[] {
  return promises
    .map((p) => ({
      id: p.promise_id,
      party: p.promise_party,
      text: p.promise_text,
      status: verdictStatus(p.evidence_direction, p.has_contradiction),
      label: p.assessment_label,
    }))
    .filter((i): i is BrokenFeedItem => i.status === "broke" || i.status === "mixed");
}

/**
 * Derives the broken-promise tally from the existing public API
 * (`/parties/scorecard` for totals, `/promises/scores?outcome=negative` for the
 * feed). Falls back to typed fixtures so the loop is always demoable.
 *
 * TODO(api): a real-time "broken since 2022" event stream would let the counter
 * tick up live; today we present the real cumulative total and animate it.
 */
export function useBrokenPromises(): BrokenPromisesData {
  const { data: scorecard, isLoading: loadingScore } = usePartyEvidenceScorecard();
  const { data: negatives, isLoading: loadingNeg } = usePromiseScores({
    outcome: "negative",
    limit: 10,
  });

  return useMemo(() => {
    const hasLive = (scorecard?.length ?? 0) > 0;

    if (!hasLive) {
      const fb = toFeed(FIXTURE_PROMISES);
      return {
        brokeTotal: fb.filter((i) => i.status === "broke").length || 3,
        mixedTotal: fb.filter((i) => i.status === "mixed").length || 1,
        feed: fb,
        isLoading: loadingScore || loadingNeg,
        isFallback: true,
      };
    }

    const brokeTotal = scorecard!.reduce((sum, p) => sum + (p.opposed_count ?? 0), 0);
    const mixedTotal = scorecard!.reduce(
      (sum, p) => sum + (p.contradictory_count ?? 0),
      0,
    );
    const feed = negatives?.data ? toFeed(negatives.data) : [];

    return {
      brokeTotal,
      mixedTotal,
      feed: feed.length > 0 ? feed : toFeed(FIXTURE_PROMISES),
      isLoading: loadingScore || loadingNeg,
      isFallback: false,
    };
  }, [scorecard, negatives, loadingScore, loadingNeg]);
}
