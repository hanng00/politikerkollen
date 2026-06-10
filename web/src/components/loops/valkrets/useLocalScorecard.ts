"use client";

import { useMemo } from "react";

import { usePartyEvidenceScorecard } from "@/hooks/useAccountability";
import { PARTY_ABBREVS, getPartyName } from "@/lib/parties";
import { gradeFromRate, type Grade } from "@/lib/grades";

export interface PartyGrade {
  party: string;
  name: string;
  grade: Grade;
  fulfillmentRate: number;
  total: number;
}

/** Illustrative fallback fulfillment rates. TODO(api). */
const FALLBACK_RATES: Record<string, number> = {
  s: 0.52, m: 0.61, sd: 0.49, c: 0.46, v: 0.4, kd: 0.55, l: 0.43, mp: 0.38,
};

/**
 * Party grades for a constituency. Party-level promise fulfilment comes from
 * the real `/parties/scorecard` mart; we present it as the local ballot's
 * report card (per-candidate grades require a per-rep endpoint — TODO(api)).
 */
export function useLocalScorecard(): { grades: PartyGrade[]; isFallback: boolean } {
  const { data } = usePartyEvidenceScorecard();

  return useMemo(() => {
    if (data && data.length > 0) {
      const grades = data
        .map((p) => {
          const rate = p.total_promises > 0 ? p.positive_count / p.total_promises : 0;
          return {
            party: p.party,
            name: getPartyName(p.party),
            grade: gradeFromRate(rate),
            fulfillmentRate: rate,
            total: p.total_promises,
          };
        })
        .sort((a, b) => b.fulfillmentRate - a.fulfillmentRate);
      return { grades, isFallback: false };
    }

    const grades = PARTY_ABBREVS.map((party) => {
      const rate = FALLBACK_RATES[party] ?? 0.5;
      return {
        party,
        name: getPartyName(party),
        grade: gradeFromRate(rate),
        fulfillmentRate: rate,
        total: 40,
      };
    }).sort((a, b) => b.fulfillmentRate - a.fulfillmentRate);
    return { grades, isFallback: true };
  }, [data]);
}
