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
    case "implemented":
      return `${party} har aktivt drivit denna fråga och regeringsförslag har antagits${evidenceSummary}.`;
    case "partial":
      return `${party} har tagit steg i linje med löftet${evidenceSummary}.`;
    case "championed":
      return `${party} har drivit frågan i riksdagen, men förslagen har inte genomförts${evidenceSummary}.`;
    case "supported":
      return `${party} har visat visst stöd för frågan${evidenceSummary}.`;
    case "contradictory":
      return `${party} har röstat både för och emot förslag i linje med detta löfte.`;
    case "opposed":
      return `${party} har röstat mot förslag i linje med detta löfte.`;
    case "unclear":
      return `Underlag saknas för att bedöma ${party}s agerande i denna fråga.`;
    default:
      return `Underlag saknas för att bedöma ${party}s agerande i denna fråga.`;
  }
}

/**
 * Short verdict label (Swedish, human-readable).
 * Focused on clarity for new users.
 */
export function getVerdictLabel(direction: string, hasContradiction?: boolean): string {
  const labels: Record<string, string> = {
    implemented: "Genomfört",
    partial: "Delvis genomfört",
    championed: "Drev frågan",
    supported: "Visst stöd",
    contradictory: "Motsägelsefullt",
    opposed: "Röstade emot",
    unclear: "Oklart",
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
    implemented: "var(--color-success)",
    partial: "oklch(0.72 0.15 175)", // teal
    championed: "oklch(0.65 0.15 250)", // blue
    supported: "var(--color-muted)",
    contradictory: "var(--color-warning)",
    opposed: "var(--color-destructive)",
    unclear: "var(--color-muted)",
  };
  return colors[direction] ?? "var(--color-muted)";
}
