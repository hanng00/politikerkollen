"use client";

import { usePartyEvidenceScorecard } from "@/hooks/useAccountability";
import { getPartyColor } from "@/lib/parties";
import { Skeleton } from "@/components/ui/skeleton";

export function MiniScorecard() {
  const { data: scores, isLoading } = usePartyEvidenceScorecard();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Laddar data...
      </p>
    );
  }

  const topParties = scores.slice(0, 8);

  return (
    <div className="space-y-2">
      {topParties.map((score) => {
        const total = Number(score.total_promises);
        const positive = Number(score.positive_count);
        const negative = Number(score.negative_count);
        const contradictory = Number(score.contradictory_count);
        
        const positivePct = total > 0 ? (positive / total) * 100 : 0;
        const negativePct = total > 0 ? (negative / total) * 100 : 0;
        const contradictoryPct = total > 0 ? (contradictory / total) * 100 : 0;

        return (
          <div key={score.party} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 w-10 shrink-0">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: getPartyColor(score.party) }}
              />
              <span className="text-xs font-medium">{score.party.toUpperCase()}</span>
            </div>
            
            <div className="flex-1 h-3 bg-muted/50 rounded-sm overflow-hidden flex">
              <div
                className="h-full"
                style={{
                  width: `${negativePct}%`,
                  backgroundColor: "var(--color-destructive)",
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${contradictoryPct}%`,
                  backgroundColor: "var(--color-warning)",
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${positivePct}%`,
                  backgroundColor: "var(--color-success)",
                }}
              />
            </div>
          </div>
        );
      })}
      
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
        <span>Emot</span>
        <span>Agerade för</span>
      </div>
    </div>
  );
}
