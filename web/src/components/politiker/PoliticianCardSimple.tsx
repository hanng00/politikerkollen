"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianSummary } from "@/hooks/useFetchPoliticians";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  MessageSquare,
  TrendingUp,
  Vote,
} from "lucide-react";
import Link from "next/link";

const partyColors: Record<string, string> = {
  S: "bg-[#E8112d]",
  M: "bg-[#52BDEC]",
  SD: "bg-[#DDDD00] text-black",
  C: "bg-[#009933]",
  V: "bg-[#DA291C]",
  KD: "bg-[#000077]",
  L: "bg-[#006AB3]",
  MP: "bg-[#83CF39] text-black",
};

function formatCompact(n: number): string {
  if (n >= 10_000) {
    return `${(n / 1000).toFixed(0)}k`;
  }
  if (n >= 1_000) {
    return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return n.toLocaleString("sv-SE");
}

export interface PoliticianCardSimpleProps {
  politician: PoliticianSummary;
  /** Percentile for total activity (0-100), if available */
  activityPercentile?: number;
  /** Percentile for rebel votes (0-100), if available */
  rebelPercentile?: number;
}

export function PoliticianCardSimple({
  politician,
  activityPercentile,
  rebelPercentile,
}: PoliticianCardSimpleProps) {
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;
  const partyColor = partyColors[politician.party] ?? "bg-muted";

  const isTopActivity = activityPercentile !== undefined && activityPercentile >= 90;
  const isHighRebel = rebelPercentile !== undefined && rebelPercentile >= 90;
  const hasRebelVotes = politician.stats.rebelVoteCount > 0;

  const cardAccent = isHighRebel
    ? "ring-1 ring-amber-500/30 bg-amber-500/[0.02]"
    : isTopActivity
      ? "ring-1 ring-primary/20 bg-primary/[0.02]"
      : "";

  return (
    <Link href={`/politiker/${politician.id}`}>
      <Card
        className={`h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer group ${cardAccent}`}
      >
        <CardContent className="pt-4 h-full">
          <div className="flex items-start gap-3 h-full">
            <Avatar className="size-10 shrink-0">
              {politician.imageUrl && (
                <AvatarImage src={politician.imageUrl} alt={politician.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium truncate">
                  {politician.name}
                </h3>
                <Badge
                  className={`text-[10px] h-4 px-1 shrink-0 ${partyColor}`}
                >
                  {politician.party}
                </Badge>
                {isTopActivity && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 shrink-0 border-primary/40 text-primary gap-0.5"
                  >
                    <TrendingUp className="size-2.5" />
                    Topp 10%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {politician.constituency}
              </p>

              <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1" title="Röstningar">
                  <Vote className="size-3" />
                  {formatCompact(politician.stats.totalVotes)}
                </span>
                <span className="flex items-center gap-1" title="Anföranden">
                  <MessageSquare className="size-3" />
                  {formatCompact(politician.stats.totalSpeeches)}
                </span>
                <span className="flex items-center gap-1" title="Dokument">
                  <FileText className="size-3" />
                  {formatCompact(politician.stats.totalAuthored)}
                </span>
                {hasRebelVotes && (
                  <span
                    className={`flex items-center gap-1 ${isHighRebel ? "text-amber-500 font-medium" : "text-amber-600/70 dark:text-amber-500/70"}`}
                    title="Rebellröster (röstat mot partiet)"
                  >
                    <AlertTriangle className="size-3" />
                    {formatCompact(politician.stats.rebelVoteCount)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
