import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";

export function ContextSection({ score }: { score: PromiseScore }) {
  const partyName = getPartyName(score.promise_party);
  const governmentParties = ["m", "kd", "l", "sd"];
  const oppositionParties = ["s", "v", "mp", "c"];
  const isGovernment = governmentParties.includes(score.promise_party);
  const isOpposition = oppositionParties.includes(score.promise_party);
  
  // Don't show context for unknown parties
  if (!isGovernment && !isOpposition) {
    return null;
  }
  
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kontext
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              {isGovernment ? (
                <>
                  <p>
                    <strong>{partyName}</strong> ingick i regeringsunderlaget 2022–2026.
                  </p>
                  <p className="text-muted-foreground">
                    Regeringspartier har större möjlighet att genomföra sin politik genom 
                    propositioner och budgetförslag.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>{partyName}</strong> var i opposition under mandatperioden 2022–2026.
                  </p>
                  <p className="text-muted-foreground">
                    Oppositionspartier kan inte själva genomföra politik, men kan stödja eller 
                    motsätta sig förslag i riksdagen. Att ett förslag avslås beror ofta på att 
                    regeringsunderlaget röstar emot.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
