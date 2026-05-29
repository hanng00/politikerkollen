"use client";

import { ArrowLeft, ArrowRight, Check, Link2, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartyScorecardById } from "@/hooks/useAccountability";
import {
  CATEGORY_NAMES,
  getPartyColor,
  getPartyName,
  needsDarkText,
} from "@/lib/parties";

const DIRECTION_LABELS: Record<string, { label: string; color: string }> = {
  implemented: { label: "Genomfört", color: "text-green-500" },
  partial: { label: "Delvis", color: "text-teal-500" },
  championed: { label: "Drev frågan", color: "text-blue-500" },
  supported: { label: "Visst stöd", color: "text-zinc-500" },
  contradictory: { label: "Motsägelsefullt", color: "text-amber-500" },
  opposed: { label: "Röstade emot", color: "text-red-500" },
  unclear: { label: "Oklart", color: "text-zinc-400" },
};

function ScorecardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-24 w-32 mx-auto" />
        <Skeleton className="h-6 w-64 mx-auto" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function PartyScorecardClient({ partyId }: { partyId: string }) {
  const { data: scorecard, isLoading, error } = usePartyScorecardById(partyId);
  const [copied, setCopied] = useState(false);

  const partyColor = getPartyColor(partyId);
  const partyName = getPartyName(partyId);
  const darkText = needsDarkText(partyId);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/parti/${partyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!scorecard) return;

    const url = `${window.location.origin}/parti/${partyId}`;
    const text = `${scorecard.party_name} har genomfört ${scorecard.fulfillment_rate}% av sina vallöften från 2022. Se hela analysen på Politikerkollen.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${scorecard.party_name}: ${scorecard.fulfillment_rate}% genomfört`,
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
            render={<Link href="/parti" />}
          >
            <ArrowLeft className="size-4" />
            Alla partier
          </Button>
        </div>

        {isLoading && <ScorecardSkeleton />}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Något gick fel"}
            </p>
          </div>
        )}

        {scorecard && (
          <div className="space-y-8">
            {/* Hero section */}
            <div className="text-center space-y-6">
              <div
                className="inline-flex items-center px-6 py-3 rounded-xl text-2xl font-bold"
                style={{
                  backgroundColor: partyColor,
                  color: darkText ? "#000" : "#fff",
                }}
              >
                {scorecard.party_name}
              </div>

              <div className="space-y-2">
                <div className="text-7xl font-bold tabular-nums">
                  {scorecard.fulfillment_rate}%
                </div>
                <div className="text-xl text-muted-foreground">genomfört</div>
              </div>

              <p className="text-muted-foreground max-w-md mx-auto">
                {scorecard.implemented_count} löften genomförda,{" "}
                {scorecard.partial_count} delvis genomförda av totalt{" "}
                {scorecard.total_promises} löften
              </p>
            </div>

            {/* Outcome distribution bar */}
            <div className="space-y-3">
              <div className="flex h-6 rounded-lg overflow-hidden">
                {scorecard.implemented_count > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{
                      width: `${(scorecard.implemented_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Genomfört: ${scorecard.implemented_count}`}
                  />
                )}
                {scorecard.partial_count > 0 && (
                  <div
                    className="bg-teal-500 transition-all"
                    style={{
                      width: `${(scorecard.partial_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Delvis: ${scorecard.partial_count}`}
                  />
                )}
                {scorecard.championed_count > 0 && (
                  <div
                    className="bg-blue-500 transition-all"
                    style={{
                      width: `${(scorecard.championed_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Drev frågan: ${scorecard.championed_count}`}
                  />
                )}
                {scorecard.supported_count > 0 && (
                  <div
                    className="bg-zinc-500 transition-all"
                    style={{
                      width: `${(scorecard.supported_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Visst stöd: ${scorecard.supported_count}`}
                  />
                )}
                {scorecard.contradictory_count > 0 && (
                  <div
                    className="bg-amber-500 transition-all"
                    style={{
                      width: `${(scorecard.contradictory_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Motsägelsefullt: ${scorecard.contradictory_count}`}
                  />
                )}
                {scorecard.opposed_count > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(scorecard.opposed_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Röstade emot: ${scorecard.opposed_count}`}
                  />
                )}
                {scorecard.unclear_count > 0 && (
                  <div
                    className="bg-zinc-300 dark:bg-zinc-700 transition-all"
                    style={{
                      width: `${(scorecard.unclear_count / scorecard.total_promises) * 100}%`,
                    }}
                    title={`Oklart: ${scorecard.unclear_count}`}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                {[
                  { key: "implemented", count: scorecard.implemented_count },
                  { key: "partial", count: scorecard.partial_count },
                  { key: "championed", count: scorecard.championed_count },
                  { key: "supported", count: scorecard.supported_count },
                  { key: "contradictory", count: scorecard.contradictory_count },
                  { key: "opposed", count: scorecard.opposed_count },
                  { key: "unclear", count: scorecard.unclear_count },
                ]
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <span className={DIRECTION_LABELS[item.key].color}>●</span>
                      <span className="text-muted-foreground">
                        {DIRECTION_LABELS[item.key].label}: {item.count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scorecard.best_categories.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-green-600 dark:text-green-400">
                      Bäst på
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scorecard.best_categories.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between">
                        <span className="text-sm">
                          {CATEGORY_NAMES[cat.category] ?? cat.category}
                        </span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {cat.fulfillment_rate}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {scorecard.worst_categories.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-red-600 dark:text-red-400">
                      Sämst på
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scorecard.worst_categories.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between">
                        <span className="text-sm">
                          {CATEGORY_NAMES[cat.category] ?? cat.category}
                        </span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {cat.fulfillment_rate}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Source breakdown */}
            {(scorecard.valmanifest_count > 0 || scorecard.tidoavtalet_count > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Källor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {scorecard.valmanifest_count > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Valmanifest 2022:</span>
                        <span className="font-medium">{scorecard.valmanifest_count} löften</span>
                      </div>
                    )}
                    {scorecard.tidoavtalet_count > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Tidöavtalet:</span>
                        <span className="font-medium">{scorecard.tidoavtalet_count} löften</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA to see all promises */}
            <div className="text-center pt-4">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={`/loften?party=${partyId}`} />}
              >
                Se alla {scorecard.total_promises} löften
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />

      {/* Fixed bottom bar with share actions */}
      {scorecard && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm safe-area-bottom">
          <div className="page-container py-3">
            <div className="flex items-center justify-center gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
