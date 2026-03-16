"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  XCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  HelpCircle,
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
import { betUrl, categorizeEvidence, getAlignmentBadge, getPromiseActionDescription, getRiksdagOutcome } from "./utils";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EvidenceCard({
  evidence,
  partyName,
}: {
  evidence: PromiseEvidence;
  partyName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const outcome = getRiksdagOutcome(evidence);
  const actionInfo = getPromiseActionDescription(evidence, partyName);
  const alignmentBadge = getAlignmentBadge(evidence.alignment);
  const isProposition = evidence.source_dok_typ === "prop";

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header: Document type, alignment badge, and title */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {isProposition ? "Proposition" : "Motion"}
              </span>
              {alignmentBadge && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  alignmentBadge.variant === "success" 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {alignmentBadge.label}
                </span>
              )}
              {evidence.source_datum && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(evidence.source_datum)}
                  </span>
                </>
              )}
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

        {/* Key info: Party action + Riksdag outcome */}
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm ${
            actionInfo.isPositive ? "bg-success/10" : "bg-destructive/10"
          }`}>
            <span className={actionInfo.isPositive ? "text-success" : "text-destructive"}>
              {partyName}: {actionInfo.action}
            </span>
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
  const [showAllFor, setShowAllFor] = useState(false);
  const [showAllAgainst, setShowAllAgainst] = useState(false);
  const [showUnclear, setShowUnclear] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  
  const partyName = getPartyName(score.promise_party);
  const categorized = categorizeEvidence(score.top_evidence);
  
  // Show ALL evidence (no artificial limit)
  const visibleFor = showAllFor 
    ? categorized.actedForPromise 
    : categorized.actedForPromise.slice(0, 5);
  const visibleAgainst = showAllAgainst 
    ? categorized.actedAgainstPromise 
    : categorized.actedAgainstPromise.slice(0, 5);

  const hasEvidence = categorized.actedForPromise.length > 0 || 
                      categorized.actedAgainstPromise.length > 0 ||
                      categorized.unclear.length > 0;

  if (!hasEvidence) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Underlag
          </span>
          <div className="flex-1 h-px bg-border" />
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="size-3" />
            {showExplainer ? "Dölj guide" : "Så tolkar du detta"}
          </button>
        </div>
        
        {/* Inline explainer */}
        {showExplainer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground space-y-2"
          >
            <p className="font-medium text-foreground">Så tolkar du underlaget:</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-start gap-2">
                <span className="bg-success/10 text-success px-1.5 py-0.5 rounded text-xs font-medium shrink-0">Stödjer löftet</span>
                <span>Dokumentet föreslår samma sak som vallöftet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-xs font-medium shrink-0">Motsätter löftet</span>
                <span>Dokumentet föreslår motsatsen till vallöftet</span>
              </li>
            </ul>
            <p className="text-xs pt-1 border-t border-border/50">
              <TrendingUp className="size-3 inline text-success mr-1" />
              <strong>Agerade i linje</strong> = partiet röstade så att det gynnar löftet
              <br />
              <TrendingDown className="size-3 inline text-destructive mr-1" />
              <strong>Agerade mot</strong> = partiet röstade så att det motverkar löftet
            </p>
            <a 
              href="/om/metodik#loften" 
              className="inline-flex items-center gap-1 text-xs text-foreground hover:underline pt-1"
            >
              Läs mer om vår metodik
              <ExternalLink className="size-3" />
            </a>
          </motion.div>
        )}
      </div>

      {/* Actions FOR the promise */}
      {categorized.actedForPromise.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-success" />
            <h3 className="text-sm font-medium">
              Agerade i linje med löftet
              <span className="text-muted-foreground font-normal ml-1">
                ({categorized.actedForPromise.length} st)
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 pl-6 border-l-2 border-success/30">
            {visibleFor.map((evidence, index) => (
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

          {categorized.actedForPromise.length > 5 && !showAllFor && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-6"
              onClick={() => setShowAllFor(true)}
            >
              <ChevronDown className="size-4 mr-1" />
              Visa {categorized.actedForPromise.length - 5} fler
            </Button>
          )}
        </div>
      )}

      {/* Actions AGAINST the promise */}
      {categorized.actedAgainstPromise.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-destructive" />
            <h3 className="text-sm font-medium">
              Agerade mot löftet
              <span className="text-muted-foreground font-normal ml-1">
                ({categorized.actedAgainstPromise.length} st)
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 pl-6 border-l-2 border-destructive/30">
            {visibleAgainst.map((evidence, index) => (
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

          {categorized.actedAgainstPromise.length > 5 && !showAllAgainst && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-6"
              onClick={() => setShowAllAgainst(true)}
            >
              <ChevronDown className="size-4 mr-1" />
              Visa {categorized.actedAgainstPromise.length - 5} fler
            </Button>
          )}
        </div>
      )}

      {/* Unclear evidence (collapsed by default) */}
      {categorized.unclear.length > 0 && (
        <Collapsible open={showUnclear} onOpenChange={setShowUnclear}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="size-4" />
            <span>
              Oklart underlag ({categorized.unclear.length} st)
            </span>
            <ChevronDown className={`size-4 transition-transform ${showUnclear ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 mt-3 pl-6 border-l-2 border-muted">
              {categorized.unclear.map((evidence, index) => (
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
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
