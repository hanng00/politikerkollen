"use client";

import Link from "next/link";
import { Flame, AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianWithStats } from "@/types";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { RankBadge } from "./RankBadge";

interface PoliticianCardProps {
  politician: PoliticianWithStats;
}

export function PoliticianCard({ politician }: PoliticianCardProps) {
  const fullName = `${politician.firstName} ${politician.lastName}`;

  return (
    <Link href={`/politiker/${politician.id}`}>
      <Card className="hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer group">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <PoliticianAvatar politician={politician} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium truncate">{fullName}</h3>
                {politician.stats.isTrending && (
                  <Flame className="size-3 text-warning shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {politician.role} ({politician.party.shortName})
              </p>
              <p className="text-xs text-muted-foreground">{politician.constituency}</p>

              <div className="flex items-center gap-2 mt-2">
                <RankBadge
                  rank={politician.stats.consistencyRank}
                  total={politician.stats.totalRanked}
                  percentile={politician.stats.consistencyPercentile}
                />
                {politician.stats.contradictionCount > 0 && (
                  <Badge variant="destructive" className="text-[9px] h-5">
                    <AlertTriangle className="size-2.5 mr-0.5" />
                    {politician.stats.contradictionCount}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
