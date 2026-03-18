"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteHeader, SiteFooter } from "@/components/layout";
import {
  PromiseScoreCard,
  PromiseScoreCardSkeleton,
} from "@/components/promises/PromiseScoreCard";
import { PromiseScoreCardCompact } from "@/components/promises/PromiseScoreCardCompact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdjacentPromises,
  usePromiseScore,
  usePromiseScores,
} from "@/hooks/useAccountability";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import type { PromiseScore } from "@/types";

function RelatedPromisesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="py-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-32" />
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
      (p) => p.promise_id !== currentPromise.promise_id,
    ) ?? [];
  const filteredCategoryPromises =
    categoryPromises?.data.filter(
      (p) => p.promise_id !== currentPromise.promise_id,
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: partyColor }}
                  />
                  Fler löften från {partyName}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link href={`/?party=${currentPromise.promise_party}`} />
                  }
                >
                  Visa alla
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPartyPromises.slice(0, 4).map((score, index) => (
                  <PromiseScoreCardCompact
                    key={score.promise_id}
                    score={score}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {hasCategoryPromises && (
            <div className="space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCategoryPromises.slice(0, 4).map((score, index) => (
                  <PromiseScoreCardCompact
                    key={score.promise_id}
                    score={score}
                    index={index}
                  />
                ))}
              </div>
            </div>
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

    const supportedCount =
      promise.motion_supported_count + promise.motion_bifall_count;
    const opposedCount = promise.motion_opposed_count;

    let summary = "";
    if (supportedCount > 0 && opposedCount > 0) {
      summary = `Stödde ${supportedCount} förslag, röstade emot ${opposedCount}.`;
    } else if (supportedCount > 0) {
      summary = `Stödde ${supportedCount} förslag.`;
    } else if (opposedCount > 0) {
      summary = `Röstade emot ${opposedCount} förslag.`;
    }

    const text = `${partyName} lovade: "${truncatedPromise}"\n\n${summary}`;

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

      <main className="page-container py-8 flex-1 pb-24">
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

      <SiteFooter />

      {promise && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm safe-area-bottom">
          <div className="page-container py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                disabled={!prev}
                nativeButton={!prev}
                render={
                  prev ? (
                    <Link href={`/loften/${prev.promise_id}`} />
                  ) : undefined
                }
              >
                <ChevronLeft className="size-5" />
                <span className="sr-only">Föregående</span>
              </Button>

              <div className="flex items-center gap-2 flex-1 justify-center">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
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
                  next ? (
                    <Link href={`/loften/${next.promise_id}`} />
                  ) : undefined
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
