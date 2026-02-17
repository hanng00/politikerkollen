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
import { Separator } from "@/components/ui/separator";
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
import { use, useMemo, useState } from "react";

import { SiteHeader } from "@/components/layout";
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
  title,
  children,
  actions,
}: {
  indicator: "vote" | "speech" | "document";
  label: string;
  date: string;
  meta?: string;
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
          <div className={`size-2 rounded-full ${indicatorColor} mt-2 shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{label}</span>
              <span>—</span>
              <span>{date}</span>
              {meta && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{meta}</span>
                </>
              )}
            </div>
            <p className="font-medium">{title}</p>
            {children}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function VoteGroupCard({ group }: { group: VoteGroup }) {
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(group.date).toLocaleDateString("sv-SE");

  const summaryParts = [];
  if (group.summary.ja > 0) summaryParts.push(<span key="ja" className="text-green-500">{group.summary.ja} Ja</span>);
  if (group.summary.nej > 0) summaryParts.push(<span key="nej" className="text-red-500">{group.summary.nej} Nej</span>);
  if (group.summary.avstar > 0) summaryParts.push(<span key="avstar" className="text-yellow-500">{group.summary.avstar} Avstår</span>);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="transition-colors hover:bg-muted/30">
        <CollapsibleTrigger className="w-full text-left cursor-pointer">
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>RÖSTNING</span>
                  <span>—</span>
                  <span>{date}</span>
                </div>
                <p className="font-medium">{group.betankandeTitel || "Betänkande"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {group.votes.length} {group.votes.length === 1 ? "röst" : "röster"}
                  {summaryParts.length > 0 && " — "}
                  {summaryParts.reduce((acc, part, i) => (
                    <>{acc}{i > 0 && ", "}{part}</>
                  ), <></>)}
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
                <span className={`text-xs font-medium w-12 shrink-0 ${
                  vote.voteValue === "Ja" ? "text-green-500" :
                  vote.voteValue === "Nej" ? "text-red-500" :
                  vote.voteValue === "Avstår" ? "text-yellow-500" : "text-muted-foreground"
                }`}>
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
  const voteColor = item.voteValue === "Ja" ? "text-green-500" :
    item.voteValue === "Nej" ? "text-red-500" :
    item.voteValue === "Avstår" ? "text-yellow-500" : "";

  return (
    <TimelineCard
      indicator="vote"
      label={item.voteValue ?? "RÖST"}
      date={date}
      title={item.title || item.betankandeTitel || "Votering"}
      actions={item.betankandeId ? (
        <a
          href={getRiksdagenBetankandeUrl(item.betankandeId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" />
        </a>
      ) : undefined}
    >
      {item.subjectText && (
        <p className="text-sm text-muted-foreground mt-1">{item.subjectText}</p>
      )}
    </TimelineCard>
  );
}

function SpeechCard({ item }: { item: TimelineItem }) {
  const date = new Date(item.date).toLocaleDateString("sv-SE");

  return (
    <TimelineCard
      indicator="speech"
      label="ANFÖRANDE"
      date={date}
      meta={item.activityType}
      title={item.title || "Anförande i kammaren"}
    >
      {item.speechText && (
        <p className="text-sm text-muted-foreground mt-2 italic line-clamp-2">
          &ldquo;{item.speechText}&rdquo;
        </p>
      )}
    </TimelineCard>
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
      actions={item.documentId ? (
        <a
          href={`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_${item.documentId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" />
        </a>
      ) : undefined}
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
  const groupedTimeline = useMemo(() => groupTimelineItems(timeline), [timeline]);

  if (loadingPolitician) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
        <SiteHeader />
        <main className="page-container max-w-4xl py-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
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
    <div className="min-h-screen min-w-0 overflow-x-clip bg-background">
      <SiteHeader />

      <main className="page-container max-w-4xl py-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -ml-2 mb-6"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-4 mr-1" />
          Tillbaka
        </Button>

        {/* Hero Section */}
        <section className="mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              {politician.imageUrl && (
                <AvatarImage src={politician.imageUrl} alt={politician.name} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{politician.name}</h1>
                <Badge className={`${partyColor}`}>{politician.party}</Badge>
              </div>
              <p className="text-muted-foreground">{politician.status}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {politician.constituency}
                </span>
                {politician.birthYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Född {politician.birthYear}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <Vote className="size-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">
                {politician.stats.totalVotes.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Röster</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <MessageSquare className="size-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">
                {politician.stats.totalSpeeches.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Anföranden</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <FileText className="size-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">
                {politician.stats.totalAuthored.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Dokument</p>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-6" />

        {/* Timeline */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Aktivitet</h2>
            <ToggleGroup
              multiple
              variant="outline"
              size="sm"
              value={activityFilter}
              onValueChange={(value) => setActivityFilter(value as ActivityType[])}
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

          {loadingTimeline ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : groupedTimeline.length > 0 ? (
            <div className="space-y-3">
              {groupedTimeline.map((item) => (
                <TimelineItemCard
                  key={item.type === "vote-group" ? `group-${item.betankandeId}-${item.date}` : item.id}
                  item={item}
                />
              ))}

              {hasNextPage && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Laddar...
                    </>
                  ) : (
                    "Visa mer"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Ingen aktivitet hittad
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
