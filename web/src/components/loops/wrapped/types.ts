import type { Grade } from "@/lib/grades";

export interface WrappedStats {
  promisesKept: number;
  promisesBroke: number;
  promisesTotal: number;
  /** TODO(api): votes/attendance/rebel are not exposed per party yet. */
  votes: number;
  attendancePct: number;
  rebelCount: number;
  topCategory: string;
  worstCategory: string;
}

export interface WrappedData {
  /** Party abbrev or politician id used in the route. */
  slug: string;
  subjectName: string;
  /** Party abbrev for colour theming. */
  party: string;
  kind: "party" | "politician";
  fulfillmentRate: number; // 0..1
  grade: Grade;
  stats: WrappedStats;
  /** Which stat fields are real vs. illustrative (drives the "≈" disclaimer). */
  estimatedFields: ReadonlyArray<keyof WrappedStats>;
  source: string;
}
