"use client";

import { useMemo } from "react";

import { usePartyScorecardById } from "@/hooks/useAccountability";
import { CATEGORY_NAMES, getPartyName } from "@/lib/parties";
import { gradeFromRate } from "@/lib/grades";

import type { WrappedData } from "./types";

/**
 * Illustrative activity numbers for slides not yet exposed per party.
 * TODO(api): replace votes/attendance/rebel with a party activity endpoint.
 */
const ACTIVITY_FIXTURE: Record<string, { votes: number; attendancePct: number; rebelCount: number }> = {
  S: { votes: 14210, attendancePct: 94, rebelCount: 38 },
  M: { votes: 13880, attendancePct: 96, rebelCount: 12 },
  SD: { votes: 13540, attendancePct: 91, rebelCount: 21 },
  C: { votes: 12990, attendancePct: 93, rebelCount: 17 },
  V: { votes: 13110, attendancePct: 95, rebelCount: 44 },
  KD: { votes: 12870, attendancePct: 92, rebelCount: 9 },
  L: { votes: 12640, attendancePct: 90, rebelCount: 14 },
  MP: { votes: 12410, attendancePct: 93, rebelCount: 26 },
};

function activityFor(party: string) {
  return ACTIVITY_FIXTURE[party.toUpperCase()] ?? { votes: 12000, attendancePct: 92, rebelCount: 20 };
}

/**
 * Builds a party's Wrapped recap. Promise stats + grade come from the real
 * `/parties/scorecard/{id}` mart; activity slides use illustrative fixtures
 * until a per-party activity endpoint exists.
 */
export function useWrappedData(party: string): { data: WrappedData; isLoading: boolean } {
  const { data: scorecard, isLoading } = usePartyScorecardById(party);

  const data = useMemo<WrappedData>(() => {
    const activity = activityFor(party);

    if (scorecard) {
      const broke = scorecard.opposed_count + scorecard.contradictory_count;
      const rate = scorecard.fulfillment_rate ?? 0;
      return {
        slug: party,
        subjectName: scorecard.party_name ?? getPartyName(party),
        party,
        kind: "party",
        fulfillmentRate: rate,
        grade: gradeFromRate(rate),
        stats: {
          promisesKept: scorecard.positive_count,
          promisesBroke: broke,
          promisesTotal: scorecard.total_promises,
          votes: activity.votes,
          attendancePct: activity.attendancePct,
          rebelCount: activity.rebelCount,
          topCategory:
            CATEGORY_NAMES[scorecard.best_categories?.[0]?.category ?? ""] ??
            scorecard.best_categories?.[0]?.category ??
            "—",
          worstCategory:
            CATEGORY_NAMES[scorecard.worst_categories?.[0]?.category ?? ""] ??
            scorecard.worst_categories?.[0]?.category ??
            "—",
        },
        estimatedFields: ["votes", "attendancePct", "rebelCount"],
        source: "Riksdagens öppna data via Politikerkollen",
      };
    }

    // Fallback demo data so the story is always playable.
    return {
      slug: party,
      subjectName: getPartyName(party),
      party,
      kind: "party",
      fulfillmentRate: 0.58,
      grade: gradeFromRate(0.58),
      stats: {
        promisesKept: 23,
        promisesBroke: 11,
        promisesTotal: 40,
        votes: activity.votes,
        attendancePct: activity.attendancePct,
        rebelCount: activity.rebelCount,
        topCategory: "Rättsväsende",
        worstCategory: "Miljö & klimat",
      },
      estimatedFields: ["votes", "attendancePct", "rebelCount", "promisesKept", "promisesBroke", "promisesTotal"],
      source: "Demovärden – Politikerkollen",
    };
  }, [scorecard, party]);

  return { data, isLoading };
}
