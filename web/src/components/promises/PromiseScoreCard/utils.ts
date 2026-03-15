import type { PromiseEvidence } from "@/types";

export function betUrl(betDokId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${betDokId.toLowerCase()}`;
}

export interface CategorizedEvidence {
  supported: PromiseEvidence[];
  opposed: PromiseEvidence[];
  unclear: PromiseEvidence[];
}

export function categorizeEvidence(evidence: PromiseEvidence[]): CategorizedEvidence {
  const supported: PromiseEvidence[] = [];
  const opposed: PromiseEvidence[] = [];
  const unclear: PromiseEvidence[] = [];

  for (const e of evidence) {
    if (e.effective_stance === "supported_motion" || e.signal_weight > 0) {
      supported.push(e);
    } else if (e.effective_stance === "opposed_motion" || e.signal_weight < 0) {
      opposed.push(e);
    } else {
      unclear.push(e);
    }
  }

  return { supported, opposed, unclear };
}

export function getPartyVoteDescription(evidence: PromiseEvidence): string {
  if (evidence.effective_stance === "supported_motion") {
    return "Röstade JA";
  } else if (evidence.effective_stance === "opposed_motion") {
    return "Röstade NEJ";
  } else if (evidence.effective_stance === "abstained") {
    return "Avstod";
  }
  return "Okänd röst";
}

export function getRiksdagOutcome(evidence: PromiseEvidence): { label: string; adopted: boolean } {
  if (evidence.motion_outcome === "bifall") {
    return { label: "Antaget av riksdagen", adopted: true };
  } else if (evidence.motion_outcome === "avslag") {
    return { label: "Avslaget av riksdagen", adopted: false };
  }
  return { label: "Ej behandlat", adopted: false };
}
