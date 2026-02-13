"use client";

import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PoliticianAvatar } from "@/components/politiker/PoliticianAvatar";
import type { Politician, CandidateScore, Topic } from "@/types";

interface Props {
  politician: Politician;
  topicScores: CandidateScore[];
  topics: Topic[];
  rank: number;
  contradictionCount: number;
}

function ScoreBar({ score }: { score: number }) {
  // -100 to +100 → 0 to 100
  const pct = Math.round((score + 100) / 2);
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full",
          pct >= 60 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function CandidateComparisonCard({
  politician,
  topicScores,
  topics,
  rank,
  contradictionCount,
}: Props) {
  const avgScore =
    topicScores.length > 0
      ? topicScores.reduce((s, t) => s + t.score, 0) / topicScores.length
      : 0;
  const matchPct = Math.round((avgScore + 100) / 2);

  return (
    <Card className={cn(rank === 1 && "ring-1 ring-primary")}>
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "size-7 rounded-full flex items-center justify-center text-xs font-semibold",
              rank === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {rank}
          </span>
          <PoliticianAvatar politician={politician} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {politician.firstName} {politician.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {politician.party.shortName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{matchPct}%</p>
          </div>
        </div>

        {/* Topic scores */}
        <div className="space-y-2">
          {topicScores.map((ts) => {
            const topic = topics.find((t) => t.id === ts.topicId);
            if (!topic) return null;
            return (
              <div key={ts.topicId} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{topic.name}</span>
                  <span>{ts.actionCount} röster</span>
                </div>
                <ScoreBar score={ts.score} />
              </div>
            );
          })}
        </div>

        {/* Warning */}
        {contradictionCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5" />
            {contradictionCount} motsägelse{contradictionCount > 1 && "r"}
          </div>
        )}

        {/* Link */}
        <Link
          href={`/politiker/${politician.id}`}
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-2 border-t"
        >
          Mer om {politician.firstName}
          <ChevronRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
