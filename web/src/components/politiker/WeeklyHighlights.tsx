"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianSummary } from "@/hooks/useFetchPoliticians";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface WeeklyHighlightsProps {
  politicians: PoliticianSummary[];
}

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

export function WeeklyHighlights({ politicians }: WeeklyHighlightsProps) {
  const highlights = useMemo(() => {
    if (politicians.length === 0) return null;

    // Find most effective politician (highest pass rate with min 5 motions)
    const effective = politicians
      .filter((p) => p.motionStats && p.motionStats.total >= 5)
      .sort((a, b) => (b.motionStats?.passRate ?? 0) - (a.motionStats?.passRate ?? 0))[0];

    // Find most independent politician (most rebel votes in a single topic)
    const independent = politicians
      .filter((p) => p.topRebelTopic && p.topRebelTopic.count >= 5)
      .sort((a, b) => (b.topRebelTopic?.count ?? 0) - (a.topRebelTopic?.count ?? 0))[0];

    // Find politician with most passed motions
    const mostPassed = politicians
      .filter((p) => p.motionStats && p.motionStats.passed > 0)
      .sort((a, b) => (b.motionStats?.passed ?? 0) - (a.motionStats?.passed ?? 0))[0];

    return { effective, independent, mostPassed };
  }, [politicians]);

  if (!highlights || (!highlights.effective && !highlights.independent && !highlights.mostPassed)) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {highlights.effective && (
        <Link href={`/politiker/${highlights.effective.id}`}>
          <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-green-500/5 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                <TrendingUp className="size-3.5" />
                <span className="font-medium">Högst genomslag</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{highlights.effective.name}</span>
                <Badge className={`text-[10px] h-4 px-1 shrink-0 ${partyColors[highlights.effective.party] ?? "bg-muted"}`}>
                  {highlights.effective.party}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {highlights.effective.motionStats?.passRate}% av motionerna bifallna
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {highlights.mostPassed && highlights.mostPassed.id !== highlights.effective?.id && (
        <Link href={`/politiker/${highlights.mostPassed.id}`}>
          <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-primary mb-2">
                <CheckCircle className="size-3.5" />
                <span className="font-medium">Flest bifallna motioner</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{highlights.mostPassed.name}</span>
                <Badge className={`text-[10px] h-4 px-1 shrink-0 ${partyColors[highlights.mostPassed.party] ?? "bg-muted"}`}>
                  {highlights.mostPassed.party}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {highlights.mostPassed.motionStats?.passed} motioner har bifallits
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {highlights.independent && (
        <Link href={`/politiker/${highlights.independent.id}`}>
          <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
                <AlertTriangle className="size-3.5" />
                <span className="font-medium">Mest oberoende</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{highlights.independent.name}</span>
                <Badge className={`text-[10px] h-4 px-1 shrink-0 ${partyColors[highlights.independent.party] ?? "bg-muted"}`}>
                  {highlights.independent.party}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Avviker ofta i {highlights.independent.topRebelTopic?.topic.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
