"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PoliticianSummary } from "@/hooks/useFetchPoliticians";
import { getPartyColor, needsDarkText } from "@/lib/parties";
import { AlertTriangle, CheckCircle, HelpCircle, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface WeeklyHighlightsProps {
  politicians: PoliticianSummary[];
}

function PartyBadge({ party }: { party: string }) {
  return (
    <Badge 
      className={`text-[10px] h-4 px-1 shrink-0 ${needsDarkText(party) ? "text-black" : ""}`}
      style={{ backgroundColor: getPartyColor(party) }}
    >
      {party}
    </Badge>
  );
}

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

    // Find most questioning politician (most interpellations + written questions)
    const mostQuestioning = politicians
      .filter((p) => p.accountabilityStats && p.accountabilityStats.totalQuestions >= 5)
      .sort((a, b) => (b.accountabilityStats?.totalQuestions ?? 0) - (a.accountabilityStats?.totalQuestions ?? 0))[0];

    // Find most scrutinized politician (most interpellations + written questions received)
    const mostScrutinized = politicians
      .filter((p) => p.scrutinizedStats && p.scrutinizedStats.totalQuestionsReceived >= 5)
      .sort((a, b) => (b.scrutinizedStats?.totalQuestionsReceived ?? 0) - (a.scrutinizedStats?.totalQuestionsReceived ?? 0))[0];

    return { effective, independent, mostPassed, mostQuestioning, mostScrutinized };
  }, [politicians]);

  if (!highlights || (!highlights.effective && !highlights.independent && !highlights.mostPassed && !highlights.mostQuestioning && !highlights.mostScrutinized)) {
    return null;
  }

  // Determine which highlights to show (max 3)
  const highlightsToShow: Array<{ type: string; politician: PoliticianSummary }> = [];
  
  if (highlights.effective) {
    highlightsToShow.push({ type: 'effective', politician: highlights.effective });
  }
  if (highlights.mostQuestioning && highlightsToShow.length < 3) {
    highlightsToShow.push({ type: 'questioning', politician: highlights.mostQuestioning });
  }
  if (highlights.mostScrutinized && highlightsToShow.length < 3) {
    highlightsToShow.push({ type: 'scrutinized', politician: highlights.mostScrutinized });
  }
  if (highlights.mostPassed && highlights.mostPassed.id !== highlights.effective?.id && highlightsToShow.length < 3) {
    highlightsToShow.push({ type: 'mostPassed', politician: highlights.mostPassed });
  }
  if (highlights.independent && highlightsToShow.length < 3) {
    highlightsToShow.push({ type: 'independent', politician: highlights.independent });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {highlightsToShow.map(({ type, politician }) => {
        if (type === 'effective') {
          return (
            <Link key={politician.id} href={`/politiker/${politician.id}`}>
              <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-green-500/5 border-green-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                    <TrendingUp className="size-3.5" />
                    <span className="font-medium">Högst genomslag</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{politician.name}</span>
                    <PartyBadge party={politician.party} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {politician.motionStats?.passRate}% av motionerna bifallna
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        }

        if (type === 'questioning') {
          return (
            <Link key={politician.id} href={`/politiker/${politician.id}`}>
              <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-blue-500/5 border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                    <HelpCircle className="size-3.5" />
                    <span className="font-medium">Mest granskande</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{politician.name}</span>
                    <PartyBadge party={politician.party} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {politician.accountabilityStats?.totalQuestions} frågor till regeringen
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        }

        if (type === 'scrutinized') {
          return (
            <Link key={politician.id} href={`/politiker/${politician.id}`}>
              <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-orange-500/5 border-orange-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-orange-600 mb-2">
                    <Target className="size-3.5" />
                    <span className="font-medium">Mest granskade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{politician.name}</span>
                    <PartyBadge party={politician.party} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {politician.scrutinizedStats?.totalQuestionsReceived} frågor från riksdagen
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        }

        if (type === 'mostPassed') {
          return (
            <Link key={politician.id} href={`/politiker/${politician.id}`}>
              <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-primary mb-2">
                    <CheckCircle className="size-3.5" />
                    <span className="font-medium">Flest bifallna motioner</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{politician.name}</span>
                    <PartyBadge party={politician.party} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {politician.motionStats?.passed} motioner har bifallits
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        }

        if (type === 'independent') {
          return (
            <Link key={politician.id} href={`/politiker/${politician.id}`}>
              <Card className="h-full hover:ring-1 hover:ring-foreground/20 transition-all cursor-pointer bg-amber-500/5 border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
                    <AlertTriangle className="size-3.5" />
                    <span className="font-medium">Mest oberoende</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{politician.name}</span>
                    <PartyBadge party={politician.party} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Avviker ofta i {politician.topRebelTopic?.topic.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        }

        return null;
      })}
    </div>
  );
}
