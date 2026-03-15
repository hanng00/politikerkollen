import type { PromiseScore } from "@/types";
import { getPartyName } from "@/lib/parties";

/**
 * Generate a human-readable narrative sentence from a PromiseScore.
 * Used in the viral card, compact cards, share text, and OG metadata.
 */
export function getNarrative(score: PromiseScore): string {
  const party = getPartyName(score.promise_party);
  const { evidence_direction: dir, has_contradiction } = score;

  const hasProposition = score.proposition_count > 0;
  const hasBifall = score.motion_bifall_count > 0;
  const hasPartyFiled = score.party_filed_count > 0;
  const hasSupported = score.motion_supported_count > 0;
  const hasOpposed = score.motion_opposed_count > 0;

  // Special case: contradiction takes priority for narrative
  if (has_contradiction) {
    const supportedCount = score.motion_supported_count + score.motion_bifall_count;
    const opposedCount = score.motion_opposed_count;
    
    if (supportedCount > 0 && opposedCount > 0) {
      return `${party} har stött ${supportedCount} förslag men även röstat emot ${opposedCount} liknande förslag.`;
    }
    return `${party} har röstat både för och emot förslag i linje med detta löfte.`;
  }

  let evidenceSummary = "";

  if (hasProposition) {
    evidenceSummary = `, inklusive genomförda regeringsförslag`;
  } else if (hasBifall && hasPartyFiled) {
    evidenceSummary = `, med egna förslag som godkänts av riksdagen`;
  } else if (hasBifall) {
    evidenceSummary = `, med förslag som godkänts av riksdagen`;
  } else if (hasPartyFiled) {
    evidenceSummary = `, med egna förslag i riksdagen`;
  } else if (hasSupported) {
    evidenceSummary = `, genom att stödja relevanta förslag`;
  } else if (hasOpposed) {
    evidenceSummary = `, trots att de röstat emot relevanta förslag`;
  }

  switch (dir) {
    case "acted":
      return `${party} har aktivt drivit denna fråga i riksdagen${evidenceSummary}.`;
    case "some_action":
      return `${party} har tagit steg i linje med löftet${evidenceSummary}.`;
    case "mixed":
      return `Bevisläget är blandat — ${party} har både stött och motsatt sig relevanta förslag.`;
    case "some_inaction":
      return `${party} har visat begränsat engagemang i frågan.`;
    case "contradiction":
      return `${party} har röstat mot förslag i linje med detta löfte.`;
    default:
      return `Underlag saknas för att bedöma ${party}s agerande i denna fråga.`;
  }
}

/**
 * Short verdict label (Swedish, human-readable).
 * When has_contradiction is true, we show that instead of the direction.
 */
export function getVerdictLabel(direction: string, hasContradiction?: boolean): string {
  // Contradiction overrides direction for clarity
  if (hasContradiction) {
    return "Motsägelse";
  }
  
  const labels: Record<string, string> = {
    acted: "Aktivt drivit",
    some_action: "Tagit steg",
    mixed: "Blandat",
    some_inaction: "Begränsat engagemang",
    contradiction: "Röstat emot",
  };
  return labels[direction] ?? "Ej bedömt";
}

/**
 * Translate Riksdag jargon into citizen-readable Swedish.
 */
export function translateSignal(signalDescription: string): string {
  const translations: Record<string, string> = {
    "Proposition antagen": "Regeringsförslag antaget",
    "Motion bifallen": "Förslaget godkänt av riksdagen",
    "Motion bifall supported": "Godkänt förslag, partiet stödde",
    "Motion bifall opposed": "Godkänt förslag, partiet motsatte sig",
    "Motion supported": "Partiet stödde förslaget",
    "Motion opposed": "Partiet röstade emot",
    "Party filed motion": "Partiet lade eget förslag",
    "Okänt": "Oklart utfall",
  };
  return translations[signalDescription] ?? signalDescription;
}

/**
 * Determine if an evidence item is "strong" enough to show by default.
 * Filters out noise: unknown signals, very low similarity.
 */
export function isStrongEvidence(evidence: {
  signal_weight: number;
  signal_description: string;
  similarity_score: number;
}): boolean {
  if (evidence.signal_description === "Okänt") return false;
  if (evidence.signal_weight === 0 && evidence.similarity_score < 0.5) return false;
  return true;
}

/**
 * Get a distinct color for each assessment tier.
 * Used for card banner lines to make verdicts visually scannable.
 */
export function getAssessmentColor(direction: string): string {
  const colors: Record<string, string> = {
    acted: "var(--color-success)",
    some_action: "oklch(0.72 0.15 175)", // teal to distinguish from acted
    mixed: "var(--color-warning)",
    some_inaction: "#f97316", // orange-500
    contradiction: "var(--color-destructive)",
  };
  return colors[direction] ?? "var(--color-muted)";
}
