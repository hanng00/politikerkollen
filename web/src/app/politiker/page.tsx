"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SiteHeader } from "@/components/layout";
import { PoliticianCardSimple } from "@/components/politiker";
import {
  SearchFilter,
  PartyFilter,
  PeriodFilter,
  ActivityFilter,
  SortFilter,
  getDateRangeFromPeriod,
  type ActivityFilterValue,
} from "@/components/politiker/filters";
import {
  useDebounce,
  useInfiniteFetchPoliticians,
  type PoliticianSummary,
  type SortOption,
} from "@/hooks";

function getTotalActivity(p: PoliticianSummary) {
  return (
    Number(p.stats.totalVotes) +
    Number(p.stats.totalSpeeches) +
    Number(p.stats.totalAuthored)
  );
}

export default function PoliticiansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("mostActive");
  const [activityFilter, setActivityFilter] = useState<ActivityFilterValue>("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [useCustomDates, setUseCustomDates] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const dateRange = useMemo(
    () =>
      getDateRangeFromPeriod(
        periodFilter,
        customFromDate,
        customToDate,
        useCustomDates
      ),
    [periodFilter, customFromDate, customToDate, useCustomDates]
  );

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteFetchPoliticians({
    search: debouncedSearch || undefined,
    party: partyFilter ?? undefined,
    sortBy,
    limit: 30,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  const politicians = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const filtered = useMemo(() => {
    if (!politicians.length) return [];

    let result = politicians;

    if (activityFilter === "active") {
      result = result.filter((p) => getTotalActivity(p) >= 100);
    } else if (activityFilter === "veryActive") {
      result = result.filter((p) => getTotalActivity(p) >= 500);
    }

    return result;
  }, [politicians, activityFilter]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
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

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />

      <main className="page-container py-8 space-y-8">
        <header className="page-section text-center">
          <h1 className="page-title">Riksdagens ledamöter</h1>
          <p className="page-subtitle">
            Sök, filtrera och se vad politikerna faktiskt gör.
          </p>
        </header>

        <section className="space-y-3">
          <SearchFilter value={searchQuery} onChange={setSearchQuery} />

          <div className="flex flex-wrap items-center gap-2">
            <PartyFilter value={partyFilter} onChange={setPartyFilter} />

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <PeriodFilter
              periodFilter={periodFilter}
              onPeriodChange={setPeriodFilter}
              customFromDate={customFromDate}
              customToDate={customToDate}
              onCustomFromDateChange={setCustomFromDate}
              onCustomToDateChange={setCustomToDate}
              useCustomDates={useCustomDates}
              onUseCustomDatesChange={setUseCustomDates}
            />

            <ActivityFilter value={activityFilter} onChange={setActivityFilter} />

            <SortFilter value={sortBy} onChange={setSortBy} />
          </div>
        </section>

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
          ) : filtered.length ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filtered.length === politicians.length
                  ? `${filtered.length} politiker${hasNextPage ? "+" : ""}`
                  : `${filtered.length} av ${politicians.length} politiker`}
              </p>
              <div className="card-grid-3">
                {filtered.map((p) => (
                  <PoliticianCardSimple key={p.id} politician={p} />
                ))}
              </div>

              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Laddar fler...</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Inga politiker hittades
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
