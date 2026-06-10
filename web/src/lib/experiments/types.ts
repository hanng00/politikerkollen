/**
 * Typed primitives for the lightweight A/B experiment harness.
 *
 * Each "experiment" maps to one of the six viral engagement loops. An
 * experiment can be toggled on/off centrally (master `enabled` flag) and a
 * visitor is deterministically bucketed into exactly one `variant` that is
 * persisted so the assignment is stable across sessions.
 */

/** A single variant within an experiment (e.g. control vs. treatment). */
export interface ExperimentVariant {
  /** Stable id, used for persistence + analytics. Never translate this. */
  id: string;
  /** Human-readable Swedish label for the lab/preview surface. */
  label: string;
  /** Relative sampling weight. Defaults to 1 (equal split) when omitted. */
  weight?: number;
}

/** Definition of one experiment / viral loop. */
export interface ExperimentDef {
  /** Stable key. Used in cookies, analytics and the `/lab/[experiment]` route. */
  key: ExperimentKey;
  /** Swedish display name shown in the lab. */
  name: string;
  /** Short Swedish description shown in the lab. */
  description: string;
  /** Master toggle. When false the loop is hidden from the main funnel. */
  enabled: boolean;
  /** Canonical in-app route where the loop lives. */
  route: string;
  /**
   * Ordered list of variants. The FIRST entry is treated as the control.
   * Must contain at least one variant.
   */
  variants: [ExperimentVariant, ...ExperimentVariant[]];
}

/** The six loops shipped behind the harness. */
export type ExperimentKey =
  | "sveket"
  | "loftesmataren"
  | "wrapped"
  | "spara"
  | "duell"
  | "valkrets";

/** A resolved assignment for a single visitor + experiment. */
export interface ExperimentAssignment {
  key: ExperimentKey;
  variant: string;
  /** Whether the loop is enabled at all (master flag). */
  enabled: boolean;
  /** True when the assigned variant is the control (first) variant. */
  isControl: boolean;
}

/** Type guard: is the given string a known experiment key? */
export function isExperimentKey(value: string): value is ExperimentKey {
  return (
    value === "sveket" ||
    value === "loftesmataren" ||
    value === "wrapped" ||
    value === "spara" ||
    value === "duell" ||
    value === "valkrets"
  );
}
