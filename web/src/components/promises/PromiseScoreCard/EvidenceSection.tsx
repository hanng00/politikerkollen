"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getPartyName } from "@/lib/parties";
import type { PromiseEvidence, PromiseScore } from "@/types";
import { betUrl, categorizeEvidence, getPartyVoteDescription, getRiksdagOutcome } from "./utils";

function EvidenceCard({
  evidence,
  partyName,
}: {
  evidence: PromiseEvidence;
  partyName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const outcome = getRiksdagOutcome(evidence);
  const partyVote = getPartyVoteDescription(evidence);
  const isProposition = evidence.source_dok_typ === "prop";

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header: Document type and title */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {isProposition ? "Regeringsförslag (Proposition)" : "Motion"}
              </span>
            </div>
            <h4 className="font-medium leading-snug">
              {evidence.source_titel}
            </h4>
          </div>
          {evidence.source_url && (
            <a
              href={evidence.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0 p-1"
              title="Öppna originaldokument"
            >
              <ExternalLink className="size-4" />
            </a>
          )}
        </div>

        {/* Key info: Party vote + Riksdag outcome */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-sm">
            <span className="text-muted-foreground">{partyName}:</span>
            <span className="font-medium">{partyVote}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm ${
            outcome.adopted ? "bg-success/10 text-success" : "bg-muted/50"
          }`}>
            {outcome.adopted ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <XCircle className="size-3.5 text-muted-foreground" />
            )}
            <span className={outcome.adopted ? "font-medium" : "text-muted-foreground"}>
              {outcome.label}
            </span>
          </div>
        </div>

        {/* Betänkande reference */}
        {evidence.bet_dok_id && (
          <p className="text-xs text-muted-foreground">
            Behandlad i{" "}
            <a
              href={betUrl(evidence.bet_dok_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-2"
            >
              betänkande {evidence.bet_dok_id}
            </a>
            {evidence.punkt_rubrik && (
              <span className="text-muted-foreground/70">
                {" "}· {evidence.punkt_rubrik}
              </span>
            )}
          </p>
        )}

        {/* Expandable: AI analysis */}
        {evidence.alignment_rationale && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              <span>Varför är detta relevant?</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-md bg-muted/30 text-sm text-muted-foreground">
                <p className="leading-relaxed">{evidence.alignment_rationale}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export function EvidenceSection({ score }: { score: PromiseScore }) {
  const [showAllSupported, setShowAllSupported] = useState(false);
  const [showAllOpposed, setShowAllOpposed] = useState(false);
  
  const partyName = getPartyName(score.promise_party);
  const categorized = categorizeEvidence(score.top_evidence);
  
  const supportedCount = score.motion_supported_count + score.motion_bifall_count;
  const opposedCount = score.motion_opposed_count;

  const visibleSupported = showAllSupported 
    ? categorized.supported 
    : categorized.supported.slice(0, 3);
  const visibleOpposed = showAllOpposed 
    ? categorized.opposed 
    : categorized.opposed.slice(0, 3);

  const hasEvidence = categorized.supported.length > 0 || categorized.opposed.length > 0;

  if (!hasEvidence) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Underlag
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Supported proposals */}
      {categorized.supported.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="size-4 text-success" />
            <h3 className="text-sm font-medium">
              Förslag {partyName} stödde
              <span className="text-muted-foreground font-normal ml-1">
                ({supportedCount} st)
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 pl-6 border-l-2 border-success/30">
            {visibleSupported.map((evidence, index) => (
              <motion.div
                key={evidence.match_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EvidenceCard evidence={evidence} partyName={partyName} />
              </motion.div>
            ))}
          </div>

          {categorized.supported.length > 3 && !showAllSupported && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-6"
              onClick={() => setShowAllSupported(true)}
            >
              <ChevronDown className="size-4 mr-1" />
              Visa {categorized.supported.length - 3} fler
            </Button>
          )}

          {supportedCount > categorized.supported.length && (
            <p className="text-xs text-muted-foreground ml-6">
              Visar {categorized.supported.length} av {supportedCount} förslag
            </p>
          )}
        </div>
      )}

      {/* Opposed proposals */}
      {categorized.opposed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsDown className="size-4 text-destructive" />
            <h3 className="text-sm font-medium">
              Förslag {partyName} röstade emot
              <span className="text-muted-foreground font-normal ml-1">
                ({opposedCount} st)
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 pl-6 border-l-2 border-destructive/30">
            {visibleOpposed.map((evidence, index) => (
              <motion.div
                key={evidence.match_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EvidenceCard evidence={evidence} partyName={partyName} />
              </motion.div>
            ))}
          </div>

          {categorized.opposed.length > 3 && !showAllOpposed && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-6"
              onClick={() => setShowAllOpposed(true)}
            >
              <ChevronDown className="size-4 mr-1" />
              Visa {categorized.opposed.length - 3} fler
            </Button>
          )}

          {opposedCount > categorized.opposed.length && (
            <p className="text-xs text-muted-foreground ml-6">
              Visar {categorized.opposed.length} av {opposedCount} förslag
            </p>
          )}
        </div>
      )}
    </section>
  );
}
