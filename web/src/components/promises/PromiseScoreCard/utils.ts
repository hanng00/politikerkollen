import type { PromiseEvidence } from "@/types";

export function betUrl(betDokId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${betDokId.toLowerCase()}`;
}

export interface CategorizedEvidence {
  /** Evidence where party acted IN LINE with their promise */
  actedForPromise: PromiseEvidence[];
  /** Evidence where party acted AGAINST their promise */
  actedAgainstPromise: PromiseEvidence[];
  /** Evidence with unclear or no stance data */
  unclear: PromiseEvidence[];
}

/**
 * Categorize evidence by whether the party's action supported or contradicted their promise.
 * 
 * This is NOT about how they voted (Ja/Nej), but about the net effect:
 * - Voting Ja on a motion that SUPPORTS the promise = acted FOR promise
 * - Voting Nej on a motion that SUPPORTS the promise = acted AGAINST promise
 * - Voting Ja on a motion that OPPOSES the promise = acted AGAINST promise
 * - Voting Nej on a motion that OPPOSES the promise = acted FOR promise
 * 
 * The signal_weight already captures this correctly:
 * - Positive weight = party action aligned with promise
 * - Negative weight = party action contradicted promise
 * - Zero weight = tangential or unclear
 */
export function categorizeEvidence(evidence: PromiseEvidence[]): CategorizedEvidence {
  const actedForPromise: PromiseEvidence[] = [];
  const actedAgainstPromise: PromiseEvidence[] = [];
  const unclear: PromiseEvidence[] = [];

  for (const e of evidence) {
    // Filter out tangential evidence - it's noise
    if (e.alignment === "tangential") {
      continue;
    }
    
    // Use signal_weight as the source of truth for promise alignment
    if (e.signal_weight > 0) {
      actedForPromise.push(e);
    } else if (e.signal_weight < 0) {
      actedAgainstPromise.push(e);
    } else if (e.effective_stance) {
      // Zero weight but has stance - categorize by alignment + stance
      const actedForMotion = e.effective_stance === "supported_motion" || 
                             e.effective_stance === "supported_proposition";
      const motionSupportsPromise = e.alignment === "supports";
      
      // XOR logic: acting for motion that supports promise = good
      //            acting against motion that opposes promise = good
      if ((actedForMotion && motionSupportsPromise) || (!actedForMotion && !motionSupportsPromise)) {
        actedForPromise.push(e);
      } else {
        actedAgainstPromise.push(e);
      }
    } else {
      unclear.push(e);
    }
  }

  return { actedForPromise, actedAgainstPromise, unclear };
}

/**
 * Get a description of what the party's action meant for the promise.
 * This explains the NET EFFECT, not just the vote.
 */
export function getPromiseActionDescription(evidence: PromiseEvidence, partyName: string): {
  action: string;
  explanation: string;
  isPositive: boolean;
} {
  const motionSupportsPromise = evidence.alignment === "supports";
  const isProposition = evidence.source_dok_typ === "prop";
  const docType = isProposition ? "förslaget" : "motionen";
  
  // Determine if party supported or opposed the document
  const supportedDoc = evidence.effective_stance === "supported_motion" || 
                       evidence.effective_stance === "supported_proposition";
  const opposedDoc = evidence.effective_stance === "opposed_motion" || 
                     evidence.effective_stance === "opposed_proposition";
  
  if (supportedDoc) {
    if (motionSupportsPromise) {
      return {
        action: "Stödde",
        explanation: `${partyName} röstade för ${docType} som ligger i linje med löftet`,
        isPositive: true,
      };
    } else {
      return {
        action: "Stödde",
        explanation: `${partyName} röstade för ${docType} som går emot löftet`,
        isPositive: false,
      };
    }
  } else if (opposedDoc) {
    if (motionSupportsPromise) {
      return {
        action: "Motsatte sig",
        explanation: `${partyName} röstade emot ${docType} som ligger i linje med löftet`,
        isPositive: false,
      };
    } else {
      return {
        action: "Motsatte sig",
        explanation: `${partyName} röstade emot ${docType} som går emot löftet`,
        isPositive: true,
      };
    }
  }
  
  return {
    action: "Okänd ställning",
    explanation: "Röstdata saknas",
    isPositive: false,
  };
}

export function getPartyVoteDescription(evidence: PromiseEvidence): string {
  if (evidence.effective_stance === "supported_motion" || evidence.effective_stance === "supported_proposition") {
    return "Röstade JA";
  } else if (evidence.effective_stance === "opposed_motion" || evidence.effective_stance === "opposed_proposition") {
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

/**
 * Get alignment badge info
 */
export function getAlignmentBadge(alignment: string | null): { label: string; variant: "success" | "destructive" | "secondary" } | null {
  if (alignment === "supports") {
    return { label: "Stödjer löftet", variant: "success" };
  } else if (alignment === "opposes") {
    return { label: "Motsätter löftet", variant: "destructive" };
  }
  return null;
}
