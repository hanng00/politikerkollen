"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";

interface MethodologySectionProps {
  score: PromiseScore;
}

function getAssessmentExplanation(score: PromiseScore): {
  title: string;
  explanation: string;
  details: string[];
} {
  const partyName = getPartyName(score.promise_party);
  const direction = score.evidence_direction;
  
  const forCount = score.motion_supported_count + score.motion_bifall_count;
  const againstCount = score.motion_opposed_count;
  const propCount = score.proposition_count;
  
  switch (direction) {
    case "implemented":
      return {
        title: "Genomfört",
        explanation: `Ett regeringsförslag (proposition) som ligger i linje med löftet har antagits av riksdagen.`,
        details: [
          `${propCount} proposition${propCount > 1 ? "er" : ""} som stödjer löftet har antagits`,
          forCount > 0 ? `${partyName} stödde ${forCount} relaterade förslag` : null,
        ].filter(Boolean) as string[],
      };
    case "partial":
      return {
        title: "Delvis genomfört",
        explanation: `${partyName} har konsekvent stött förslag i linje med löftet, och några av dem har antagits av riksdagen.`,
        details: [
          `${score.motion_bifall_count} motion${score.motion_bifall_count > 1 ? "er" : ""} som stödjer löftet har antagits`,
          `${partyName} stödde totalt ${forCount} relaterade förslag`,
        ],
      };
    case "championed":
      return {
        title: "Drev frågan",
        explanation: `${partyName} har konsekvent stött förslag i linje med löftet, men inget av dem har antagits av riksdagen.`,
        details: [
          `${partyName} stödde ${forCount} förslag som ligger i linje med löftet`,
          `Inget av förslagen antogs av riksdagen`,
          score.party_filed_count > 0 ? `${partyName} lade själva ${score.party_filed_count} motion${score.party_filed_count > 1 ? "er" : ""} i frågan` : null,
        ].filter(Boolean) as string[],
      };
    case "supported":
      return {
        title: "Visst stöd",
        explanation: `${partyName} har visat visst stöd för förslag i linje med löftet, men inte konsekvent.`,
        details: [
          forCount > 0 ? `Stödde ${forCount} förslag i linje med löftet` : null,
          againstCount > 0 ? `Agerade mot ${againstCount} förslag i linje med löftet` : null,
        ].filter(Boolean) as string[],
      };
    case "contradictory":
      return {
        title: "Motsägelsefullt",
        explanation: `${partyName} har både stött och motarbetat förslag som ligger i linje med löftet.`,
        details: [
          `Stödde ${forCount} förslag i linje med löftet`,
          `Agerade mot ${againstCount} förslag i linje med löftet`,
          `Detta tyder på inkonsekvent agerande i frågan`,
        ],
      };
    case "opposed":
      return {
        title: "Röstade emot",
        explanation: `${partyName} har huvudsakligen agerat mot förslag som ligger i linje med löftet.`,
        details: [
          `Agerade mot ${againstCount} förslag i linje med löftet`,
          forCount > 0 ? `Stödde endast ${forCount} förslag` : `Stödde inga förslag i linje med löftet`,
        ],
      };
    case "unclear":
    default:
      return {
        title: "Oklart",
        explanation: `Det finns inte tillräckligt med underlag för att bedöma hur ${partyName} agerat i förhållande till löftet.`,
        details: [
          `Inga relevanta förslag hittades där ${partyName}s ställningstagande kunde fastställas`,
        ],
      };
  }
}

export function MethodologySection({ score }: MethodologySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const assessment = getAssessmentExplanation(score);

  return (
    <section className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            Om bedömningen
          </span>
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-muted/30 mt-2">
            <CardContent className="pt-4 pb-4 space-y-4">
              {/* Assessment explanation */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Bedömning: {assessment.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {assessment.explanation}
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {assessment.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>

              {/* How it works */}
              <div className="pt-3 border-t space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-1.5">
                  <Info className="size-3.5" />
                  Så fungerar analysen
                </h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Vi matchar vallöften mot riksdagens dokument (motioner och propositioner) 
                    med hjälp av AI. Varje dokument klassificeras som:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><span className="text-success font-medium">Stödjer löftet</span> — föreslår samma sak som löftet</li>
                    <li><span className="text-destructive font-medium">Motsätter löftet</span> — föreslår motsatsen</li>
                  </ul>
                  <p>
                    Sedan analyserar vi hur partiet röstade. Att rösta JA på ett förslag som 
                    <em> motsätter</em> löftet räknas som att agera <em>mot</em> löftet.
                  </p>
                </div>
              </div>

              {/* Disclaimer and link */}
              <div className="pt-3 border-t text-sm text-muted-foreground space-y-2">
                <p>
                  AI-analysen kan innehålla fel. Verifiera alltid mot originalkällorna via länkarna ovan.
                </p>
                <Link 
                  href="/om/metodik#loften" 
                  className="inline-flex items-center gap-1 text-foreground hover:underline"
                >
                  Läs mer om vår metodik
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
