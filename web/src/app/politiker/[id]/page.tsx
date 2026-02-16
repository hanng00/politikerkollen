"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ChevronLeft,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Vote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

import { SiteHeader } from "@/components/layout";
import { useFetchPolitician } from "@/hooks/useFetchPolitician";
import {
  useFetchPoliticianTimeline,
  type TimelineItem,
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

function TimelineItemCard({ item }: { item: TimelineItem }) {
  const date = new Date(item.date).toLocaleDateString("sv-SE");

  if (item.type === "vote") {
    const voteColor =
      item.voteValue === "Ja"
        ? "text-green-600"
        : item.voteValue === "Nej"
          ? "text-red-600"
          : "text-yellow-600";

    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Vote className="size-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${voteColor}`}>
                  {item.voteValue}
                </span>
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>
              <p className="text-sm mt-1">
                {item.title || item.betankandeTitel || "Votering"}
              </p>
              {item.subjectText && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item.subjectText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (item.type === "speech") {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="size-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">Anförande</span>
                <span className="text-xs text-muted-foreground">{date}</span>
                {item.activityType && (
                  <Badge variant="outline" className="text-[10px]">
                    {item.activityType}
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-1">
                {item.title || "Anförande i kammaren"}
              </p>
              {item.speechText && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                  {item.speechText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // authored
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <FileText className="size-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {item.documentType || "Dokument"}
              </span>
              <span className="text-xs text-muted-foreground">{date}</span>
              {item.authorRole && (
                <Badge variant="outline" className="text-[10px]">
                  {item.authorRole}
                </Badge>
              )}
            </div>
            <p className="text-sm mt-1">{item.title || "Dokument"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PoliticianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

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
  } = useFetchPoliticianTimeline(id, { limit: 20 });

  const timeline = timelineData?.pages.flatMap((page) => page.data) ?? [];

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
          <h2 className="text-lg font-semibold mb-4">Aktivitet</h2>

          {loadingTimeline ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : timeline.length > 0 ? (
            <div className="space-y-3">
              {timeline.map((item) => (
                <TimelineItemCard key={item.id} item={item} />
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
