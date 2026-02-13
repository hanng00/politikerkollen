"use client";

import { use, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Share2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { SiteHeader } from "@/components/layout";
import { CandidateComparisonCard, VoterGuideShare } from "@/components/val";
import {
  getConstituencyBySlug,
  getCandidatesForConstituency,
  getScoresForCandidate,
  getPoliticianById,
  politicianStats,
  topics,
} from "@/mocks";

export default function ConstituencyResultsPage({
  params,
}: {
  params: Promise<{ constituency: string }>;
}) {
  const { constituency: constituencySlug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showShare, setShowShare] = useState(false);

  const selectedTopicIds = useMemo(() => {
    const param = searchParams.get("topics");
    return param ? param.split(",") : [];
  }, [searchParams]);

  const selectedTopics = useMemo(
    () => topics.filter((t) => selectedTopicIds.includes(t.id)),
    [selectedTopicIds]
  );

  const constituency = getConstituencyBySlug(constituencySlug);

  const candidates = useMemo(() => {
    if (!constituency) return [];

    return getCandidatesForConstituency(constituency.id)
      .map((id) => {
        const politician = getPoliticianById(id);
        if (!politician) return null;

        const scores = getScoresForCandidate(id).filter((s) =>
          selectedTopicIds.includes(s.topicId)
        );

        const avgScore =
          scores.length > 0
            ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
            : 0;

        return {
          politician,
          scores,
          matchPercentage: Math.round((avgScore + 100) / 2),
          contradictionCount: politicianStats[id]?.contradictionCount ?? 0,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [constituency, selectedTopicIds]);

  const topCandidate = candidates[0];

  if (!constituency) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-clip">
        <SiteHeader />
        <main className="page-container py-12 text-center">
          <p className="text-muted-foreground">Valkretsen hittades inte.</p>
          <Button className="mt-4" onClick={() => router.push("/val")}>
            Tillbaka
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />

      <main className="page-container py-6">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/val">
            <Button variant="ghost" size="sm" className="-ml-2">
              <ChevronLeft className="size-4 mr-1" />
              Ändra
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShare(true)}
          >
            <Share2 className="size-3.5 mr-1.5" />
            Dela
          </Button>
        </div>

        {/* Header */}
        <div className="max-w-xl mx-auto mb-6">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <MapPin className="size-3.5" />
            {constituency.name}
          </div>
          <h1 className="text-xl font-semibold mb-2">Kandidater</h1>
          <div className="flex flex-wrap gap-1.5">
            {selectedTopics.map((t) => (
              <Badge key={t.id} variant="secondary" className="text-xs">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-w-xl mx-auto space-y-3">
          {candidates.map((c, i) => (
            <CandidateComparisonCard
              key={c.politician.id}
              politician={c.politician}
              topicScores={c.scores}
              topics={selectedTopics}
              rank={i + 1}
              contradictionCount={c.contradictionCount}
            />
          ))}
        </div>

        {/* Method */}
        <p className="max-w-xl mx-auto mt-8 text-xs text-muted-foreground text-center">
          Matchningen baseras på röstningar i riksdagen.{" "}
          <Link href="/manifesto" className="underline">
            Läs mer
          </Link>
        </p>
      </main>

      {topCandidate && (
        <VoterGuideShare
          open={showShare}
          onOpenChange={setShowShare}
          constituency={constituency}
          topCandidateName={`${topCandidate.politician.firstName} ${topCandidate.politician.lastName}`}
          selectedTopics={selectedTopicIds}
        />
      )}
    </div>
  );
}
