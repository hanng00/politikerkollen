"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartyEvidenceScorecard } from "@/hooks/useAccountability";
import { getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";

function PartyCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

interface PartyCardProps {
  party: string;
  totalPromises: number;
  implementedCount: number;
  partialCount: number;
  rank: number;
}

function PartyCard({
  party,
  totalPromises,
  implementedCount,
  partialCount,
  rank,
}: PartyCardProps) {
  const partyColor = getPartyColor(party);
  const partyName = getPartyName(party);
  const darkText = needsDarkText(party);
  const fulfillmentRate =
    totalPromises > 0
      ? Math.round(((implementedCount + partialCount) / totalPromises) * 100)
      : 0;

  return (
    <Link href={`/parti/${party}`} className="block group">
      <Card className="transition-all hover:border-foreground/20 hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-medium">
                  #{rank}
                </span>
                <div
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: partyColor,
                    color: darkText ? "#000" : "#fff",
                  }}
                >
                  {partyName}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                  {implementedCount > 0 && (
                    <div
                      className="bg-green-500"
                      style={{
                        width: `${(implementedCount / totalPromises) * 100}%`,
                      }}
                    />
                  )}
                  {partialCount > 0 && (
                    <div
                      className="bg-teal-500"
                      style={{
                        width: `${(partialCount / totalPromises) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {implementedCount + partialCount} av {totalPromises} löften
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">
                {fulfillmentRate}%
              </div>
              <div className="text-xs text-muted-foreground">genomfört</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {implementedCount} genomfört · {partialCount} delvis
            </span>
            <span className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              Se detaljer
              <ArrowRight className="size-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PartyIndexClient() {
  const { data: parties, isLoading, error } = usePartyEvidenceScorecard();

  // Sort by fulfillment rate (implemented + partial / total)
  const sortedParties = parties
    ? [...parties].sort((a, b) => {
        const rateA =
          a.total_promises > 0
            ? (a.implemented_count + a.partial_count) / a.total_promises
            : 0;
        const rateB =
          b.total_promises > 0
            ? (b.implemented_count + b.partial_count) / b.total_promises
            : 0;
        return rateB - rateA;
      })
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="page-container py-8 flex-1">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Hur gick det för partierna?</h1>
          <p className="text-muted-foreground text-lg">
            Jämför hur riksdagspartierna har uppfyllt sina vallöften från 2022,
            rangordnade efter genomförandegrad.
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <PartyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Något gick fel"}
            </p>
          </div>
        )}

        {sortedParties.length > 0 && (
          <div className="grid gap-4">
            {sortedParties.map((party, index) => (
              <PartyCard
                key={party.party}
                party={party.party}
                totalPromises={party.total_promises}
                implementedCount={party.implemented_count}
                partialCount={party.partial_count}
                rank={index + 1}
              />
            ))}
          </div>
        )}

        {/* Methodology note */}
        <div className="mt-12 p-6 rounded-lg bg-muted/50 space-y-3">
          <h2 className="font-semibold">Om beräkningen</h2>
          <p className="text-sm text-muted-foreground">
            Genomförandegraden beräknas som andelen löften som är antingen
            &quot;Genomfört&quot; (proposition antagen med partiets stöd) eller
            &quot;Delvis genomfört&quot; (motioner med bifall). Analysen baseras
            på partiernas valmanifest från 2022 samt Tidöavtalet, matchade mot
            riksdagens voteringsprotokoll med hjälp av AI.
          </p>
          <Link
            href="/loften"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Utforska alla löften
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
