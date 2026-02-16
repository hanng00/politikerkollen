"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useState } from "react";

import { SiteHeader } from "@/components/layout";
import { PoliticianCardSimple } from "@/components/politiker";
import { useFetchPoliticians } from "@/hooks";

// Swedish party abbreviations
const partyFilters = ["S", "M", "SD", "C", "V", "KD", "L", "MP"];

export default function PoliticiansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);

  // Debounce search - only search when user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce effect
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // In production, use a proper debounce hook
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const {
    data: politicians,
    isLoading,
    error,
  } = useFetchPoliticians({
    search: debouncedSearch || undefined,
    party: partyFilter ?? undefined,
    limit: 100,
  });

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />

      <main className="page-container py-8 space-y-8">
        {/* Hero */}
        <header className="page-section text-center">
          <h1 className="page-title">Riksdagens ledamöter</h1>
          <p className="page-subtitle">
            Sök, filtrera och se vad politikerna faktiskt gör.
          </p>
        </header>

        {/* Search & Filters */}
        <section className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Sök politiker..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="filter-bar">
            <Button
              variant={partyFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => setPartyFilter(null)}
            >
              Alla
            </Button>
            {partyFilters.map((party) => (
              <Button
                key={party}
                variant={partyFilter === party ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => setPartyFilter(party)}
              >
                {party}
              </Button>
            ))}
          </div>
        </section>

        {/* Politicians Grid */}
        <section>
          {isLoading ? (
            <div className="card-grid-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Kunde inte ladda politiker</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Okänt fel"}
              </p>
            </div>
          ) : politicians?.length ? (
            <div className="card-grid-3">
              {politicians.map((p) => (
                <PoliticianCardSimple key={p.id} politician={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Inga politiker hittades
            </p>
          )}
        </section>

        {/* Stats */}
        <Separator />
        <section className="card-grid-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">{politicians?.length ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Riksdagsledamöter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">
                {politicians
                  ?.reduce((sum, p) => sum + p.stats.totalVotes, 0)
                  .toLocaleString() ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                Totalt antal röster
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold">
                {politicians
                  ?.reduce((sum, p) => sum + p.stats.totalSpeeches, 0)
                  .toLocaleString() ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                Totalt antal anföranden
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
