"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ExternalLink,
  HelpCircle,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import {
  getAssessmentColor,
  getNarrative,
  getVerdictLabel,
  isStrongEvidence,
  translateSignal,
} from "@/lib/promise-narratives";
import type { PromiseEvidence, PromiseScore } from "@/types";

function betUrl(betDokId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${betDokId.toLowerCase()}`;
}

function getDirectionIcon(direction: string, className = "size-5") {
  const map: Record<string, React.ReactNode> = {
    acted: <CheckCircle2 className={`${className} text-green-600`} />,
    some_action: <CircleDot className={`${className} text-green-500`} />,
    mixed: <HelpCircle className={`${className} text-amber-500`} />,
    some_inaction: <MinusCircle className={`${className} text-orange-500`} />,
    contradiction: <XCircle className={`${className} text-red-600`} />,
  };
  return (
    map[direction] ?? (
      <HelpCircle className={`${className} text-muted-foreground`} />
    )
  );
}

function stanceLabel(stance: string): string {
  const labels: Record<string, string> = {
    supported_motion: "Stödde förslaget",
    opposed_motion: "Röstade emot",
    abstained: "Avstod",
  };
  return labels[stance] ?? stance;
}

// ---------------------------------------------------------------------------
// LAYER 1: The Viral Card - Redesigned for impact
// ---------------------------------------------------------------------------

function ViralCard({ score }: { score: PromiseScore }) {
  const partyColor = getPartyColor(score.promise_party);
  const partyName = getPartyName(score.promise_party);
  const narrative = getNarrative(score);
  const assessmentColor = getAssessmentColor(score.evidence_direction);
  const verdict = getVerdictLabel(score.evidence_direction);
  const categoryName = CATEGORY_NAMES[score.category] ?? score.category;

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: assessmentColor }} />

      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              style={{ borderColor: partyColor, color: partyColor }}
            >
              {partyName} {score.promise_year}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {categoryName}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {getDirectionIcon(score.evidence_direction, "size-4")}
            <span className="text-sm font-medium">{verdict}</span>
          </div>
        </div>

        <blockquote className="text-lg font-serif leading-relaxed">
          &ldquo;{score.promise_text}&rdquo;
        </blockquote>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {narrative}
        </p>

        {score.has_contradiction && (
          <div className="flex items-center gap-2 text-sm font-medium p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            Partiet har även röstat mot liknande förslag
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// LAYER 2: Data Summary
// ---------------------------------------------------------------------------

function DataSummary({ score }: { score: PromiseScore }) {
  const categoryName = CATEGORY_NAMES[score.category] ?? score.category;

  // Show outcome-based counts (these don't overlap with each other)
  // party_filed_count overlaps with these, so we don't show it separately
  const counts = [
    {
      n: score.proposition_count,
      label: "regeringsförslag",
      color: "bg-success",
      explanation: "Propositioner från regeringen som stödjer löftet.",
    },
    {
      n: score.motion_bifall_count,
      label: "godkända motioner",
      color: "bg-success/70",
      explanation: "Motioner som riksdagen godkänt och som stödjer löftet.",
    },
    {
      n: score.motion_supported_count,
      label: "stödda motioner",
      color: "bg-primary",
      explanation: "Motioner partiet röstat för (även om de avslogs).",
    },
    {
      n: score.motion_opposed_count,
      label: "motsatta motioner",
      color: "bg-destructive",
      explanation: "Motioner i linje med löftet som partiet röstat emot.",
    },
  ].filter((c) => c.n > 0);

  if (counts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Riksdagsbeslut
        </h3>
        <Badge variant="secondary">{categoryName}</Badge>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {counts.map((c) => (
              <TooltipProvider key={c.label} delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={<span />}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-help"
                  >
                    <span className={`size-2 rounded-full ${c.color}`} />
                    <span className="tabular-nums font-medium text-foreground">
                      {c.n}
                    </span>{" "}
                    {c.label}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {c.explanation}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LAYER 3: Evidence Trail
// ---------------------------------------------------------------------------

function EvidenceItem({
  evidence,
  index,
}: {
  evidence: PromiseEvidence;
  index: number;
}) {
  const isPositive = evidence.signal_weight > 0;
  const isNegative = evidence.signal_weight < 0;
  const translated = translateSignal(evidence.signal_description);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: isPositive
                ? "var(--color-success)"
                : isNegative
                  ? "var(--color-destructive)"
                  : "var(--color-muted-foreground)",
            }}
          />
          <div className="w-px flex-1 bg-border mt-1.5" />
        </div>

        <div className="flex-1 min-w-0 pb-6 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[11px]">
              {evidence.source_dok_typ === "mot" ? "Motion" : "Proposition"}
            </Badge>
            <Badge
              variant={
                isPositive
                  ? "default"
                  : isNegative
                    ? "destructive"
                    : "secondary"
              }
              className="text-[11px]"
            >
              {translated}
            </Badge>
          </div>

          <h4 className="text-sm font-medium leading-snug">
            {evidence.source_titel}
            {evidence.source_url && (
              <a
                href={evidence.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex ml-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3" />
              </a>
            )}
          </h4>

          {evidence.bet_dok_id && (
            <p className="text-xs text-muted-foreground">
              <a
                href={betUrl(evidence.bet_dok_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Betänkande {evidence.bet_dok_id}
              </a>
              {evidence.punkt_rubrik && (
                <>
                  {" "}
                  · Punkt {evidence.punkt}: {evidence.punkt_rubrik}
                </>
              )}
            </p>
          )}

          {evidence.alignment_rationale && (
            <div className="border-l-2 border-muted-foreground/30 pl-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">
                AI-analys
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {evidence.alignment_rationale}
              </p>
            </div>
          )}

          {evidence.effective_stance &&
            evidence.effective_stance !== "unknown" && (
              <div className="flex items-center gap-2 text-xs pt-0.5">
                <Badge variant="outline" className="text-[11px]">
                  {stanceLabel(evidence.effective_stance)}
                </Badge>
                {evidence.motion_outcome && (
                  <Badge
                    variant={
                      evidence.motion_outcome === "bifall"
                        ? "default"
                        : "secondary"
                    }
                    className="text-[11px]"
                  >
                    {evidence.motion_outcome === "bifall"
                      ? "Godkänt"
                      : "Avslaget"}
                  </Badge>
                )}
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Exported components
// ---------------------------------------------------------------------------

export function PromiseScoreCard({ score }: { score: PromiseScore }) {
  const [showAll, setShowAll] = useState(false);

  const strong = score.top_evidence.filter(isStrongEvidence);
  const visibleEvidence = showAll
    ? score.top_evidence
    : strong.length > 0
      ? strong
      : score.top_evidence.slice(0, 3);
  const hiddenCount = showAll
    ? 0
    : score.top_evidence.length - visibleEvidence.length;

  return (
    <div className="space-y-8">
      <ViralCard score={score} />

      <DataSummary score={score} />

      {score.top_evidence.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Viktigaste besluten
          </h3>
          <div>
            {visibleEvidence.map((evidence, index) => (
              <EvidenceItem
                key={evidence.match_id}
                evidence={evidence}
                index={index}
              />
            ))}
          </div>
          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAll(true)}
            >
              <ChevronDown className="size-4 mr-1" />
              Visa {hiddenCount} fler
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PromiseScoreCardSkeleton() {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-muted animate-pulse" />
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="size-2.5 rounded-full bg-muted animate-pulse mt-1.5" />
            <div className="flex-1 space-y-2 pb-6">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
