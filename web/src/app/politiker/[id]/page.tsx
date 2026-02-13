"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Vote,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  Bell,
  BellOff,
  Share2,
  Flame,
  Twitter,
  Facebook,
  Link2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SiteHeader } from "@/components/layout";
import {
  useFetchPolitician,
  useFetchContradictions,
  useFetchVotes,
  useFetchPromises,
  useFetchPromiseStats,
  useFetchPoliticians,
} from "@/hooks";
import {
  PoliticianHero,
  ContradictionCard,
  ActivityCard,
  TopicBreakdown,
  PromiseTracker,
  CompareSection,
} from "@/components/politiker";
import type { TopicStats } from "@/types";

// Generate topic stats from votes (simplified)
function useTopicStats(politicianId: string): TopicStats[] {
  const { data: votes } = useFetchVotes(politicianId);
  const { data: contradictions } = useFetchContradictions(politicianId);

  if (!votes) return [];

  const statsMap = new Map<string, { topic: TopicStats["topic"]; actionCount: number; consistent: number; total: number }>();

  for (const vote of votes) {
    const existing = statsMap.get(vote.topic.id) ?? {
      topic: vote.topic,
      actionCount: 0,
      consistent: 0,
      total: 0,
    };
    existing.actionCount++;
    existing.total++;
    if (vote.followedParty) existing.consistent++;
    statsMap.set(vote.topic.id, existing);
  }

  if (contradictions) {
    for (const c of contradictions) {
      const existing = statsMap.get(c.topic.id) ?? {
        topic: c.topic,
        actionCount: 0,
        consistent: 0,
        total: 0,
      };
      existing.total++;
      statsMap.set(c.topic.id, existing);
    }
  }

  return Array.from(statsMap.values())
    .map((s) => ({
      topic: s.topic,
      actionCount: s.actionCount,
      consistencyScore: s.total > 0 ? Math.round((s.consistent / s.total) * 100) : 100,
    }))
    .sort((a, b) => b.actionCount - a.actionCount);
}

export default function PoliticianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("contradictions");

  const { data: politician, isLoading: loadingPolitician } = useFetchPolitician(id);
  const { data: contradictions, isLoading: loadingContradictions } = useFetchContradictions(id);
  const { data: votes } = useFetchVotes(id, { limit: 5 });
  const { data: promises } = useFetchPromises(id);
  const { data: promiseStats } = useFetchPromiseStats(id);
  const { data: similarPoliticians } = useFetchPoliticians({
    partyId: politician?.party.id,
    sortBy: "rank",
    limit: 4,
  });

  const topicStats = useTopicStats(id);

  // Filter out current politician from similar list
  const filteredSimilar = similarPoliticians?.filter((p) => p.id !== id).slice(0, 3) ?? [];

  if (loadingPolitician) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Politiker hittades inte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kontrollera länken och försök igen
          </p>
          <Button className="mt-4" onClick={() => router.push("/politiker")}>
            Till alla politiker
          </Button>
        </div>
      </div>
    );
  }

  const featuredContradiction = contradictions?.[0];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Page actions bar */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -ml-2"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-4 mr-1" />
            Tillbaka
          </Button>
          <Button
            variant={isFollowing ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? (
              <>
                <BellOff className="size-4 mr-1.5" />
                Följer
              </>
            ) : (
              <>
                <Bell className="size-4 mr-1.5" />
                Bevaka
              </>
            )}
          </Button>
        </div>

        {/* Hero Section */}
        <section className="mb-6">
          <PoliticianHero politician={politician} />
        </section>

        <Separator className="my-6" />

        {/* Featured Contradiction */}
        {featuredContradiction && (
          <>
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  Senaste motsägelsen
                </h2>
                {featuredContradiction.isTrending && (
                  <Badge variant="destructive" className="text-[9px]">
                    <Flame className="size-2.5 mr-0.5" />
                    Viral
                  </Badge>
                )}
              </div>
              <div className="max-w-2xl">
                <ContradictionCard
                  contradiction={featuredContradiction}
                  politician={politician}
                  featured
                />
              </div>
            </section>
            <Separator className="my-6" />
          </>
        )}

        {/* Tabs */}
        <section>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="contradictions" className="flex-1 text-xs">
                <AlertTriangle className="size-3 mr-1" />
                Motsägelser ({contradictions?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1 text-xs">
                <Vote className="size-3 mr-1" />
                Aktivitet
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1 text-xs">
                <BarChart3 className="size-3 mr-1" />
                Statistik
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contradictions" className="mt-4 space-y-3">
              {loadingContradictions ? (
                <>
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </>
              ) : (
                <>
                  {contradictions?.slice(1).map((c) => (
                    <ContradictionCard
                      key={c.id}
                      contradiction={c}
                      politician={politician}
                    />
                  ))}
                  {contradictions && contradictions.length > 3 && (
                    <Button variant="outline" className="w-full text-xs">
                      Visa alla motsägelser
                      <ChevronDown className="size-3 ml-1" />
                    </Button>
                  )}
                  {contradictions?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Inga motsägelser hittade
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="space-y-1">
                {votes?.map((vote) => (
                  <ActivityCard key={vote.id} type="vote" data={vote} />
                ))}
              </div>
              <Button variant="outline" className="w-full text-xs mt-3">
                Visa all aktivitet
                <ChevronDown className="size-3 ml-1" />
              </Button>
            </TabsContent>

            <TabsContent value="stats" className="mt-4 space-y-4">
              {/* Topic breakdown */}
              {topicStats.length > 0 && <TopicBreakdown topics={topicStats} />}

              {/* Promise tracker */}
              {promises && promiseStats && promises.length > 0 && (
                <PromiseTracker promises={promises} stats={promiseStats} />
              )}

              {/* Compare section */}
              {filteredSimilar.length > 0 && (
                <CompareSection
                  currentPolitician={politician}
                  similarPoliticians={filteredSimilar}
                  onSelectPolitician={(pid) => router.push(`/politiker/${pid}`)}
                />
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Sticky bottom CTA */}
        <div className="sticky bottom-0 p-4 bg-linear-to-t from-background via-background to-transparent">
          <Card className="border-primary/20 bg-background">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">Hittat något intressant?</p>
                  <p className="text-xs text-muted-foreground">
                    Dela så fler ser vad politikerna gör
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-transparent bg-primary text-primary-foreground px-2 text-xs font-medium hover:bg-primary/80 [&_svg]:size-3"
                  >
                    <Share2 className="size-3" />
                    Dela profil
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Twitter className="size-4 mr-2" />
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Facebook className="size-4 mr-2" />
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link2 className="size-4 mr-2" />
                      Kopiera länk
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
