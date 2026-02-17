"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/layout";
import { PoliticianCardSimple } from "@/components/politiker";
import { useFetchPoliticians, useDebounce, type PoliticianSummary } from "@/hooks";

// Swedish party abbreviations
const partyFilters = ["S", "M", "SD", "C", "V", "KD", "L", "MP"];

type SortOption = "name" | "mostActive" | "mostVotes" | "mostSpeeches";
type ActivityFilter = "all" | "active" | "veryActive";

const activityFilterItems = [
  { value: "all", label: "Alla aktivitetsnivåer" },
  { value: "active", label: "Aktiva (100+)" },
  { value: "veryActive", label: "Mycket aktiva (500+)" },
];

const sortItems = [
  { value: "mostActive", label: "Mest aktiva" },
  { value: "mostVotes", label: "Flest röster" },
  { value: "mostSpeeches", label: "Flest anföranden" },
  { value: "name", label: "Namn A-Ö" },
];

function getTotalActivity(p: PoliticianSummary) {
  return p.stats.totalVotes + p.stats.totalSpeeches + p.stats.totalAuthored;
}

export default function PoliticiansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("mostActive");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: politicians,
    isLoading,
    error,
  } = useFetchPoliticians({
    search: debouncedSearch || undefined,
    party: partyFilter ?? undefined,
    limit: 500,
  });

  // Client-side filtering and sorting
  const filteredAndSorted = useMemo(() => {
    if (!politicians) return [];

    let result = [...politicians];

    // Filter by activity level (using sensible thresholds)
    if (activityFilter === "active") {
      result = result.filter((p) => getTotalActivity(p) >= 100);
    } else if (activityFilter === "veryActive") {
      result = result.filter((p) => getTotalActivity(p) >= 500);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "mostActive":
          return getTotalActivity(b) - getTotalActivity(a);
        case "mostVotes":
          return b.stats.totalVotes - a.stats.totalVotes;
        case "mostSpeeches":
          return b.stats.totalSpeeches - a.stats.totalSpeeches;
        case "name":
        default:
          return a.name.localeCompare(b.name, "sv");
      }
    });

    return result;
  }, [politicians, sortBy, activityFilter]);

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
        <section className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Sök politiker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter bar - all filters in one row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Party filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={partyFilter === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPartyFilter(null)}
              >
                Alla partier
              </Button>
              {partyFilters.map((party) => (
                <Button
                  key={party}
                  variant={partyFilter === party ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPartyFilter(party)}
                >
                  {party}
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            {/* Activity filter dropdown */}
            <Select
              value={activityFilter}
              onValueChange={(v) => setActivityFilter(v as ActivityFilter)}
            >
              <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm">
                <span className="flex-1 text-left">
                  {activityFilterItems.find((i) => i.value === activityFilter)?.label}
                </span>
              </SelectTrigger>
              <SelectContent>
                {activityFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort dropdown */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-auto min-w-[140px] h-8 text-sm">
                <ArrowDownWideNarrow className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                <span className="flex-1 text-left">
                  {sortItems.find((i) => i.value === sortBy)?.label}
                </span>
              </SelectTrigger>
              <SelectContent>
                {sortItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          ) : filteredAndSorted.length ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredAndSorted.length === politicians?.length
                  ? `${filteredAndSorted.length} politiker`
                  : `${filteredAndSorted.length} av ${politicians?.length} politiker`}
              </p>
              <div className="card-grid-3">
                {filteredAndSorted.map((p) => (
                  <PoliticianCardSimple key={p.id} politician={p} />
                ))}
              </div>
            </>
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
