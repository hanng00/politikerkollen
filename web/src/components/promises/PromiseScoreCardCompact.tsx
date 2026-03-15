"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Shield,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import { getAssessmentColor } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

function getAssessmentIcon(direction: PromiseScore["evidence_direction"]) {
  switch (direction) {
    case "implemented":
      return <CheckCircle2 className="size-3.5 text-success" />;
    case "partial":
      return <CheckCircle2 className="size-3.5 text-teal-500" />;
    case "championed":
      return <Shield className="size-3.5 text-blue-500" />;
    case "supported":
      return <HelpCircle className="size-3.5 text-muted-foreground" />;
    case "contradictory":
      return <AlertTriangle className="size-3.5 text-amber-500" />;
    case "opposed":
      return <XCircle className="size-3.5 text-destructive" />;
    case "unclear":
    default:
      return <HelpCircle className="size-3.5 text-muted-foreground" />;
  }
}

function getAssessmentSublabel(score: PromiseScore): string {
  const supportedCount =
    score.motion_supported_count + score.motion_bifall_count;
  const opposedCount = score.motion_opposed_count;
  const totalRelevant = supportedCount + opposedCount;

  switch (score.evidence_direction) {
    case "implemented":
      return "Regeringsförslag antaget";
    case "partial":
      return `${score.motion_bifall_count} motion bifallen`;
    case "championed":
      return `Stödde ${supportedCount} förslag`;
    case "supported":
      return `Stödde ${supportedCount} av ${totalRelevant}`;
    case "contradictory":
      return `Stödde ${supportedCount}, emot ${opposedCount}`;
    case "opposed":
      return `${opposedCount} av ${totalRelevant} förslag`;
    case "unclear":
    default:
      return "Otillräckligt underlag";
  }
}

export function PromiseScoreCardCompact({
  score,
  index = 0,
}: {
  score: PromiseScore;
  index?: number;
}) {
  const partyColor = getPartyColor(score.promise_party);
  const partyName = getPartyName(score.promise_party);

  const assessmentColor = getAssessmentColor(score.evidence_direction);
  const assessmentIcon = getAssessmentIcon(score.evidence_direction);
  const assessmentSublabel = getAssessmentSublabel(score);

  const supportedCount =
    score.motion_supported_count +
    score.motion_bifall_count +
    score.proposition_count;
  const opposedCount = score.motion_opposed_count;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 4) * 0.05, duration: 0.3 }}
    >
      <Link href={`/loften/${score.promise_id}`}>
        <Card className="overflow-hidden h-full hover:ring-primary/20 transition-all cursor-pointer group">
          <CardContent className="p-0 min-w-0 flex flex-col h-full">
            {/* LOVADE section */}
            <div className="p-4 pb-3 border-b border-border/50 flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lovade
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: partyColor, color: partyColor }}
                >
                  {partyName} {score.promise_year}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_NAMES[score.category] ?? score.category}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed line-clamp-3">
                &ldquo;{score.promise_text}&rdquo;
              </p>
            </div>

            {/* AGERADE section - uses API data */}
            <div
              className="p-4 pt-3"
              style={{ borderTop: `2px solid ${assessmentColor}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Agerade
                  </span>
                  {assessmentIcon}
                  <span className="text-xs font-semibold">
                    {score.assessment_label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {supportedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{supportedCount}</span>
                    <span className="text-muted-foreground">stödda</span>
                  </span>
                )}
                {opposedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{opposedCount}</span>
                    <span className="text-muted-foreground">emot</span>
                  </span>
                )}
                <ChevronRight className="size-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
