"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  HelpCircle,
  Link2,
  MinusCircle,
  Share2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteHeader } from "@/components/layout";
import {
  PromiseScoreCard,
  PromiseScoreCardSkeleton,
} from "@/components/promises/PromiseScoreCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePromiseScore,
  usePromiseScores,
  useAdjacentPromises,
} from "@/hooks/useAccountability";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import { getAssessmentColor, getVerdictLabel, getNarrative } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

function getAssessmentIcon(direction: string, size = "size-3.5") {
  switch (direction) {
    case "acted":
      return <CheckCircle2 className={`${size} text-green-600`} />;
    case "some_action":
      return <CircleDot className={`${size} text-green-500`} />;
    case "mixed":
      return <HelpCircle className={`${size} text-amber-500`} />;
    case "some_inaction":
      return <MinusCircle className={`${size} text-orange-500`} />;
    case "contradiction":
      return <XCircle className={`${size} text-red-600`} />;
    default:
      return <HelpCircle className={`${size} text-muted-foreground`} />;
  }
}

function RelatedPromiseCard({ score }: { score: PromiseScore }) {
  const partyColor = getPartyColor(score.promise_party);
  const partyName = getPartyName(score.promise_party);
  const verdict = getVerdictLabel(score.evidence_direction);
  const assessmentColor = getAssessmentColor(score.evidence_direction);

  return (
    <Link href={`/loften/${score.promise_id}`}>
      <Card className="overflow-hidden h-full hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer group">
        <div className="h-1" style={{ backgroundColor: assessmentColor }} />
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: partyColor, color: partyColor }}
            >
              {partyName}
            </Badge>
            <div className="flex items-center gap-1">
              {getAssessmentIcon(score.evidence_direction)}
              <span className="text-[10px] font-medium">{verdict}</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed line-clamp-2">
            &ldquo;{score.promise_text}&rdquo;
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {score.proposition_count +
                score.motion_bifall_count +
                score.motion_supported_count +
                score.motion_opposed_count}{" "}
              riksdagsbeslut
            </span>
            <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RelatedPromisesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <div className="h-1 bg-muted" />
          <CardContent className="py-3 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExploreMoreSection({
  currentPromise,
}: {
  currentPromise: PromiseScore;
}) {
  const { data: partyPromises, isLoading: partyLoading } = usePromiseScores({
    party: currentPromise.promise_party,
    limit: 5,
  });

  const { data: categoryPromises, isLoading: categoryLoading } =
    usePromiseScores({
      category: currentPromise.category,
      limit: 5,
    });

  const partyColor = getPartyColor(currentPromise.promise_party);
  const partyName = getPartyName(currentPromise.promise_party);
  const categoryName =
    CATEGORY_NAMES[currentPromise.category] ?? currentPromise.category;

  const filteredPartyPromises =
    partyPromises?.data.filter(
      (p) => p.promise_id !== currentPromise.promise_id
    ) ?? [];
  const filteredCategoryPromises =
    categoryPromises?.data.filter(
      (p) => p.promise_id !== currentPromise.promise_id
    ) ?? [];

  const isLoading = partyLoading || categoryLoading;
  const hasPartyPromises = filteredPartyPromises.length > 0;
  const hasCategoryPromises = filteredCategoryPromises.length > 0;

  if (!isLoading && !hasPartyPromises && !hasCategoryPromises) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Utforska fler löften</h2>
        <p className="text-sm text-muted-foreground">
          Se hur andra vallöften har följts upp i riksdagen
        </p>
      </div>

      {isLoading ? (
        <RelatedPromisesSkeleton />
      ) : (
        <div className="space-y-8">
          {hasPartyPromises && (
            <Card className="overflow-hidden">
              <div
                className="h-1"
                style={{ backgroundColor: partyColor }}
              />
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Fler löften från {partyName}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/?party=${currentPromise.promise_party}`}
                      />
                    }
                  >
                    Visa alla
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredPartyPromises.slice(0, 4).map((score) => (
                    <RelatedPromiseCard key={score.promise_id} score={score} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasCategoryPromises && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Fler löften inom {categoryName.toLowerCase()}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link href={`/?category=${currentPromise.category}`} />
                    }
                  >
                    Visa alla
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredCategoryPromises.slice(0, 4).map((score) => (
                    <RelatedPromiseCard key={score.promise_id} score={score} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

export default function PromiseDetailClient({ id }: { id: string }) {
  const { data: promise, isLoading, error } = usePromiseScore(id);
  const [copied, setCopied] = useState(false);

  const { prev, next } = useAdjacentPromises(id, {
    party: promise?.promise_party,
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/loften/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!promise) return;

    const url = `${window.location.origin}/loften/${id}`;
    const partyName = getPartyName(promise.promise_party);
    const truncatedPromise =
      promise.promise_text.length > 80
        ? `${promise.promise_text.slice(0, 80)}…`
        : promise.promise_text;
    const narrative = getNarrative(promise);
    const text = `${partyName} lovade: "${truncatedPromise}"\n\n${narrative}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${partyName}: "${truncatedPromise}"`,
          text,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="page-container-narrow py-8 flex-1 pb-24">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Politikerkollen jämför vallöften med faktiska röstningar i riksdagen
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeft className="size-4" />
            Tillbaka
          </Button>
        </div>

        {isLoading && <PromiseScoreCardSkeleton />}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Något gick fel"}
            </p>
          </div>
        )}

        {promise && (
          <>
            <PromiseScoreCard score={promise} />
            <ExploreMoreSection currentPromise={promise} />
          </>
        )}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="page-container text-center text-muted-foreground">
          <p className="text-sm">
            Data från{" "}
            <a
              href="https://data.riksdagen.se"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Riksdagens öppna data
            </a>
          </p>
        </div>
      </footer>

      {promise && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm safe-area-bottom">
          <div className="page-container-narrow py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                disabled={!prev}
                nativeButton={!prev}
                render={
                  prev ? <Link href={`/loften/${prev.promise_id}`} /> : undefined
                }
              >
                <ChevronLeft className="size-5" />
                <span className="sr-only">Föregående</span>
              </Button>

              <div className="flex items-center gap-2 flex-1 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Kopierad!
                    </>
                  ) : (
                    <>
                      <Link2 className="size-4" />
                      Kopiera länk
                    </>
                  )}
                </Button>
                <Button size="sm" onClick={handleShare}>
                  <Share2 className="size-4" />
                  Dela
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                disabled={!next}
                nativeButton={!next}
                render={
                  next ? <Link href={`/loften/${next.promise_id}`} /> : undefined
                }
              >
                <ChevronRight className="size-5" />
                <span className="sr-only">Nästa</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
