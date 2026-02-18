"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Vote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SiteHeader } from "@/components/layout";
import { PartyLoyaltyCard } from "@/components/politiker/PartyLoyaltyCard";
import { RebelVotesCard } from "@/components/politiker/RebelVotesCard";
import { TopTopicsCard } from "@/components/politiker/TopTopicsCard";
import { VoteBreakdownChart } from "@/components/politiker/VoteBreakdownChart";
import { useFetchPolitician } from "@/hooks/useFetchPolitician";
import {
  groupTimelineItems,
  useFetchPoliticianTimeline,
  type ActivityType,
  type GroupedTimelineItem,
  type TimelineItem,
  type VoteGroup,
} from "@/hooks/useFetchPoliticianTimeline";

// Party colors
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

function getRiksdagenBetankandeUrl(betankandeId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/${betankandeId}/`;
}

// Unified timeline item structure
function TimelineCard({
  indicator,
  label,
  date,
  meta,
  topic,
  title,
  children,
  actions,
}: {
  indicator: "vote" | "speech" | "document";
  label: string;
  date: string;
  meta?: string;
  topic?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const indicatorColor = {
    vote: "bg-blue-500",
    speech: "bg-orange-500",
    document: "bg-emerald-500",
  }[indicator];

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div
            className={`size-2 rounded-full ${indicatorColor} mt-2 shrink-0`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
              <span>{label}</span>
              <span>—</span>
              <span>{date}</span>
              {meta && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{meta}</span>
                </>
              )}
              {topic && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {topic}
                </Badge>
              )}
            </div>
            <p className="font-medium">{title}</p>
            {children}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VoteGroupCard({ group }: { group: VoteGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(group.date).toLocaleDateString("sv-SE");

  const summaryParts = [];
  if (group.summary.ja > 0)
    summaryParts.push(
      <span key="ja" className="text-green-500">
        {group.summary.ja} Ja
      </span>,
    );
  if (group.summary.nej > 0)
    summaryParts.push(
      <span key="nej" className="text-red-500">
        {group.summary.nej} Nej
      </span>,
    );
  if (group.summary.avstar > 0)
    summaryParts.push(
      <span key="avstar" className="text-yellow-500">
        {group.summary.avstar} Avstår
      </span>,
    );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="transition-colors hover:bg-muted/30">
        <CollapsibleTrigger className="w-full text-left cursor-pointer">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
                  <span>RÖSTNING</span>
                  <span>—</span>
                  <span>{date}</span>
                  {group.topic && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {group.topic}
                    </Badge>
                  )}
                </div>
                <p className="font-medium">
                  {group.betankandeTitel || "Betänkande"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {group.votes.length}{" "}
                  {group.votes.length === 1 ? "röst" : "röster"}
                  {summaryParts.length > 0 && " — "}
                  {summaryParts.reduce(
                    (acc, part, i) => (
                      <>
                        {acc}
                        {i > 0 && ", "}
                        {part}
                      </>
                    ),
                    <></>,
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {group.betankandeId && (
                  <a
                    href={getRiksdagenBetankandeUrl(group.betankandeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                  </a>
                )}
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mx-4 mb-4 pl-5 border-l border-border py-2">
            {group.votes.map((vote) => (
              <div key={vote.id} className="py-2 flex items-start gap-3">
                <span
                  className={`text-xs font-medium w-12 shrink-0 ${
                    vote.voteValue === "Ja"
                      ? "text-green-500"
                      : vote.voteValue === "Nej"
                        ? "text-red-500"
                        : vote.voteValue === "Avstår"
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                  }`}
                >
                  {vote.voteValue}
                </span>
                <span className="text-sm text-muted-foreground">
                  {vote.title || vote.subjectText || `Punkt ${vote.votePunkt}`}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function SingleVoteCard({ item }: { item: TimelineItem }) {
  const date = new Date(item.date).toLocaleDateString("sv-SE");

  return (
    <TimelineCard
      indicator="vote"
      label={item.voteValue ?? "RÖST"}
      date={date}
      topic={item.topic}
      title={item.title || item.betankandeTitel || "Votering"}
      actions={
        item.betankandeId ? (
          <a
            href={getRiksdagenBetankandeUrl(item.betankandeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
          </a>
        ) : undefined
      }
    >
      {item.subjectText && (
        <p className="text-sm text-muted-foreground mt-1">{item.subjectText}</p>
      )}
    </TimelineCard>
  );
}

function SpeechCard({ item }: { item: TimelineItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(item.date).toLocaleDateString("sv-SE");
  const hasExpandableContent = !!item.speechText;

  // Build context string: "Anförande #3" or "Replik #5" etc.
  const speechLabel = item.isReply ? "REPLIK" : "ANFÖRANDE";
  const speechNumberText = item.speechNumber ? `#${item.speechNumber}` : "";

  // Build debate context: what document/topic is being debated
  const debateContext = item.debateType || item.activityType;

  if (!hasExpandableContent) {
    return (
      <TimelineCard
        indicator="speech"
        label={`${speechLabel}${speechNumberText ? ` ${speechNumberText}` : ""}`}
        date={date}
        meta={debateContext}
        topic={item.topic}
        title={item.title || item.betankandeTitel || "Anförande i kammaren"}
      />
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="transition-colors hover:bg-muted/30">
        <CollapsibleTrigger className="w-full text-left cursor-pointer">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="size-2 rounded-full bg-orange-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
                  <span>
                    {speechLabel}
                    {speechNumberText ? ` ${speechNumberText}` : ""}
                  </span>
                  <span>—</span>
                  <span>{date}</span>
                  {debateContext && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{debateContext}</span>
                    </>
                  )}
                  {item.topic && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal"
                    >
                      {item.topic}
                    </Badge>
                  )}
                </div>
                <p className="font-medium">
                  {item.title || item.betankandeTitel || "Anförande i kammaren"}
                </p>
                {item.speechSubTitle && (
                  <p className="text-sm text-muted-foreground">
                    {item.speechSubTitle}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2 italic line-clamp-2">
                  &ldquo;{item.speechText}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.protocolUrl && (
                  <a
                    href={item.protocolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" />
                  </a>
                )}
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mx-4 mb-4 pl-5 border-l border-border py-2">
            <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
              &ldquo;{item.speechText}&rdquo;
            </p>
            {item.protocolUrl && (
              <a
                href={item.protocolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3"
              >
                <ExternalLink className="size-3" />
                Läs hela debatten på riksdagen.se
              </a>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AuthoredCard({ item }: { item: TimelineItem }) {
  const date = new Date(item.date).toLocaleDateString("sv-SE");

  return (
    <TimelineCard
      indicator="document"
      label={item.documentType?.toUpperCase() || "DOKUMENT"}
      date={date}
      meta={item.authorRole}
      title={item.title || "Dokument"}
      actions={
        item.documentId ? (
          <a
            href={`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_${item.documentId}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" />
          </a>
        ) : undefined
      }
    />
  );
}

function TimelineItemCard({ item }: { item: GroupedTimelineItem }) {
  if (item.type === "vote-group") {
    return <VoteGroupCard group={item} />;
  }

  if (item.type === "vote") {
    return <SingleVoteCard item={item} />;
  }

  if (item.type === "speech") {
    return <SpeechCard item={item} />;
  }

  return <AuthoredCard item={item} />;
}

export default function PoliticianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activityFilter, setActivityFilter] = useState<ActivityType[]>([]);

  const {
    data: politician,
    isLoading: loadingPolitician,
    error,
  } = useFetchPolitician(id);
  const {
    data: timelineData,
    isLoading: loadingTimeline,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFetchPoliticianTimeline(id, {
    limit: 20,
    types: activityFilter.length > 0 ? activityFilter : undefined,
  });

  const timeline = timelineData?.pages.flatMap((page) => page.data) ?? [];
  const groupedTimeline = useMemo(
    () => groupTimelineItems(timeline),
    [timeline],
  );

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (loadingPolitician) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
        <SiteHeader />
        <main className="page-container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !politician) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold">Politiker hittades inte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error
              ? error.message
              : "Kontrollera länken och försök igen"}
          </p>
          <Button className="mt-4" onClick={() => router.push("/politiker")}>
            Till alla politiker
          </Button>
        </div>
      </div>
    );
  }

  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;
  const partyColor = partyColors[politician.party] ?? "bg-muted";

  return (
    <div className="h-full min-w-0 overflow-x-clip bg-background flex flex-col">
      <SiteHeader />

      <main className="page-container py-6 flex-1 flex flex-col min-h-0 gap-4">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="size-4 mr-1" />
            Tillbaka
          </Button>
        </div>

        {/* Two-column layout: Profile/Insights | Timeline */}
        {/* On desktop: fixed height, both columns scroll independently */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 flex-1 min-h-0">
          {/* LEFT COLUMN: Profile + Insights - sticky on desktop, scrollable if tall */}
          <div className="space-y-6 lg:overflow-y-auto lg:max-h-[calc(100vh-140px)] lg:sticky lg:top-6 lg:pr-2">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="size-20 mb-4">
                    {politician.imageUrl && (
                      <AvatarImage
                        src={politician.imageUrl}
                        alt={politician.name}
                      />
                    )}
                    <AvatarFallback className="text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold">{politician.name}</h1>
                    <Badge className={`${partyColor}`}>
                      {politician.party}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {politician.status}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {politician.constituency}
                    </span>
                    {politician.birthYear && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {politician.birthYear}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <p className="text-xl font-bold">
                      {politician.stats.totalVotes.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Röster</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">
                      {politician.stats.totalSpeeches.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Anföranden</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">
                      {politician.stats.totalAuthored.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Dokument</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insight Cards */}
            {politician.voteBreakdown && politician.stats.totalVotes > 0 && (
              <VoteBreakdownChart
                voteBreakdown={politician.voteBreakdown}
                totalVotes={politician.stats.totalVotes}
              />
            )}
            {politician.partyLoyalty &&
              politician.partyLoyalty.totalVotes > 0 && (
                <PartyLoyaltyCard
                  partyLoyalty={politician.partyLoyalty}
                  partyName={politician.party}
                />
              )}
            {politician.topTopics && politician.topTopics.length > 0 && (
              <TopTopicsCard topTopics={politician.topTopics} />
            )}
            {politician.rebelVotes && politician.rebelVotes.length > 0 && (
              <RebelVotesCard
                rebelVotes={politician.rebelVotes}
                partyName={politician.party}
              />
            )}
          </div>

          {/* RIGHT COLUMN: Activity Timeline - scrollable */}
          <div className="flex flex-col min-h-0 lg:max-h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between mb-4 shrink-0 bg-background pb-2">
              <h2 className="text-lg font-semibold">Aktivitet</h2>
              <ToggleGroup
                multiple
                variant="outline"
                size="sm"
                value={activityFilter}
                onValueChange={(value) =>
                  setActivityFilter(value as ActivityType[])
                }
              >
                <ToggleGroupItem value="vote" aria-label="Visa röster">
                  <Vote className="size-3.5" />
                  <span className="hidden sm:inline">Röster</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="speech" aria-label="Visa anföranden">
                  <MessageSquare className="size-3.5" />
                  <span className="hidden sm:inline">Anföranden</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="authored" aria-label="Visa dokument">
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Dokument</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Scrollable timeline content */}
            <div className="flex-1 overflow-y-auto lg:pr-2">
              {loadingTimeline ? (
                <div className="space-y-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : groupedTimeline.length > 0 ? (
                <div className="space-y-3">
                  {groupedTimeline.map((item, index) => (
                    <TimelineItemCard
                      key={
                        item.type === "vote-group"
                          ? `group-${item.betankandeId}-${item.date}-${index}`
                          : item.id
                      }
                      item={item}
                    />
                  ))}

                  {/* Infinite scroll trigger */}
                  <div ref={loadMoreRef} className="py-4 flex justify-center">
                    {isFetchingNextPage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">Laddar fler aktiviteter...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Ingen aktivitet hittad
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
