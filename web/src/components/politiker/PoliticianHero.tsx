"use client";

import { Flame, Eye, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianWithStats } from "@/types";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { RankBadge } from "./RankBadge";

interface PoliticianHeroProps {
  politician: PoliticianWithStats;
}

export function PoliticianHero({ politician }: PoliticianHeroProps) {
  const fullName = `${politician.firstName} ${politician.lastName}`;

  return (
    <section className="space-y-4">
      {/* Profile header */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <PoliticianAvatar politician={politician} size="lg" />
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              {fullName}
              {politician.stats.isTrending && (
                <Flame className="size-4 text-warning" />
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {politician.role} ({politician.party.shortName})
            </p>
            <p className="text-xs text-muted-foreground">{politician.constituency}</p>
          </div>
        </div>
      </div>

      {/* The Hook - Rank card */}
      <Card className="bg-linear-to-r from-destructive/5 to-transparent border-destructive/20">
        <CardContent className="pt-4">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Konsekvensranking</p>
              <div className="flex items-center gap-3">
                <RankBadge
                  rank={politician.stats.consistencyRank}
                  total={politician.stats.totalRanked}
                  percentile={politician.stats.consistencyPercentile}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mindre konsekvent än{" "}
                <span className="font-semibold text-foreground">
                  {100 - politician.stats.consistencyPercentile}%
                </span>{" "}
                av riksdagsledamöterna
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-destructive">
                {politician.stats.contradictionCount}
              </p>
              <p className="text-xs text-muted-foreground">motsägelser</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social proof */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="size-3" />
          {politician.stats.viewCount.toLocaleString()} visningar
        </span>
        <span className="flex items-center gap-1">
          <Share2 className="size-3" />
          {politician.stats.shareCount} delningar
        </span>
      </div>
    </section>
  );
}
