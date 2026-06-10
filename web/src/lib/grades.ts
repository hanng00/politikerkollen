/**
 * Shared grade helpers (A–F) used by the local scorecard and Wrapped recap.
 *
 * Grades are a *presentation* of the fulfillment rate that already lives in the
 * marts — this module never recomputes scoring, it only buckets an existing
 * 0–100 percentage into a letter and maps it to colours.
 */

export type Grade = "A" | "B" | "C" | "D" | "F";

/** Bucket a 0–100 percentage into a school-style letter grade. */
export function gradeFromPercent(percent: number): Grade {
  const p = Math.max(0, Math.min(100, percent));
  if (p >= 80) return "A";
  if (p >= 65) return "B";
  if (p >= 50) return "C";
  if (p >= 35) return "D";
  return "F";
}

/** Convenience for fulfillment rates expressed as 0..1. */
export function gradeFromRate(rate: number): Grade {
  return gradeFromPercent(rate * 100);
}

/** Tailwind text-colour class using existing design tokens. */
export function gradeTextClass(grade: Grade): string {
  switch (grade) {
    case "A":
      return "text-success";
    case "B":
      return "text-success";
    case "C":
      return "text-warning";
    case "D":
      return "text-warning";
    case "F":
      return "text-destructive";
  }
}

/** Hex accent for the (oklch-incompatible) share-card renderer. */
export function gradeAccentHex(grade: Grade): string {
  switch (grade) {
    case "A":
    case "B":
      return "#22c55e";
    case "C":
    case "D":
      return "#f59e0b";
    case "F":
      return "#ef4444";
  }
}

const GRADE_WORDS: Record<Grade, string> = {
  A: "Håller ord",
  B: "Mestadels",
  C: "Blandat",
  D: "Sviktar",
  F: "Bryter löften",
};

/** Short Swedish descriptor for a grade. */
export function gradeWord(grade: Grade): string {
  return GRADE_WORDS[grade];
}
