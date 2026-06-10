import type { PromiseScore } from "@/types";

/**
 * Shared, clearly-typed demo fixtures for the viral loops so every surface is
 * demoable without a running backend.
 *
 * TODO(api): these stand in for `GET /promises/scores` / `mart_promise_score`.
 * The connected components prefer live data and only fall back to these.
 * Numbers are illustrative, NOT a published assessment.
 */

function makePromise(p: Partial<PromiseScore> & Pick<PromiseScore, "promise_id" | "promise_party" | "promise_text" | "category" | "evidence_direction">): PromiseScore {
  return {
    promise_year: 2022,
    source_type: "valmanifest",
    composite_score: 0,
    evidence_strength: "moderate",
    assessment_label: "",
    total_evidence_count: 0,
    proposition_count: 0,
    motion_bifall_count: 0,
    motion_supported_count: 0,
    motion_opposed_count: 0,
    party_filed_count: 0,
    adopted_count: 0,
    rejected_count: 0,
    top_evidence: [],
    has_strong_positive: false,
    has_contradiction: false,
    ...p,
  } as PromiseScore;
}

export const FIXTURE_PROMISES: PromiseScore[] = [
  makePromise({
    promise_id: "fx-1",
    promise_party: "M",
    promise_text: "Sänka skatten på arbete för låg- och medelinkomsttagare.",
    category: "skatt",
    evidence_direction: "implemented",
    assessment_label: "Genomfört",
    composite_score: 0.82,
    proposition_count: 2,
    motion_supported_count: 3,
    has_strong_positive: true,
  }),
  makePromise({
    promise_id: "fx-2",
    promise_party: "M",
    promise_text: "Bygga ut kärnkraften med minst tio nya reaktorer.",
    category: "miljo",
    evidence_direction: "championed",
    assessment_label: "Drev frågan",
    composite_score: 0.41,
    party_filed_count: 2,
    motion_supported_count: 1,
  }),
  makePromise({
    promise_id: "fx-3",
    promise_party: "M",
    promise_text: "Skärpa straffen för gängkriminalitet och organiserad brottslighet.",
    category: "rattsvasende",
    evidence_direction: "implemented",
    assessment_label: "Genomfört",
    composite_score: 0.74,
    proposition_count: 1,
    motion_bifall_count: 2,
  }),
  makePromise({
    promise_id: "fx-4",
    promise_party: "M",
    promise_text: "Inte höja bensin- och dieselskatten under mandatperioden.",
    category: "skatt",
    evidence_direction: "contradictory",
    assessment_label: "Motsägelsefullt",
    composite_score: 0.02,
    motion_supported_count: 1,
    motion_opposed_count: 1,
    has_contradiction: true,
  }),
  makePromise({
    promise_id: "fx-5",
    promise_party: "M",
    promise_text: "Värna strandskyddet i tätbefolkade områden.",
    category: "miljo",
    evidence_direction: "opposed",
    assessment_label: "Röstade emot",
    composite_score: -0.55,
    motion_opposed_count: 3,
  }),
  makePromise({
    promise_id: "fx-6",
    promise_party: "S",
    promise_text: "Återinföra och förstärka resurserna till välfärden.",
    category: "vard",
    evidence_direction: "championed",
    assessment_label: "Drev frågan",
    composite_score: 0.38,
    party_filed_count: 3,
  }),
  makePromise({
    promise_id: "fx-7",
    promise_party: "S",
    promise_text: "Stoppa vinstjakten i välfärden.",
    category: "vard",
    evidence_direction: "opposed",
    assessment_label: "Röstade emot",
    composite_score: -0.31,
    motion_opposed_count: 2,
  }),
  makePromise({
    promise_id: "fx-8",
    promise_party: "SD",
    promise_text: "Kraftigt minska invandringen och stärka gränskontrollen.",
    category: "migration",
    evidence_direction: "implemented",
    assessment_label: "Genomfört",
    composite_score: 0.69,
    proposition_count: 2,
    motion_supported_count: 2,
    has_strong_positive: true,
  }),
];

/** Promises for one party, falling back to all fixtures if none match. */
export function fixturePromisesForParty(party: string): PromiseScore[] {
  const upper = party.toUpperCase();
  const matches = FIXTURE_PROMISES.filter(
    (p) => p.promise_party.toUpperCase() === upper,
  );
  return matches.length > 0 ? matches : FIXTURE_PROMISES;
}
