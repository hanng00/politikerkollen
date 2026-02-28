"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SiteHeader } from "@/components/layout";
import {
  PoliticianCardSimple,
  PoliticianCardSkeleton,
  WeeklyHighlights,
} from "@/components/politiker";
import {
  SearchFilter,
  PartyFilter,
  ConstituencyFilter,
  SortFilter,
} from "@/components/politiker/filters";
import {
  useDebounce,
  useInfiniteFetchPoliticians,
  type SortOption,
} from "@/hooks";

export default function PoliticiansPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [constituencyFilter, setConstituencyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("mostEffective");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

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
    constituency: constituencyFilter ?? undefined,
    sortBy,
    limit: 30,
  });

  const politicians = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

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

  const hasActiveFilters =
    partyFilter !== null ||
    constituencyFilter !== null ||
    sortBy !== "mostEffective";

  const clearFilters = () => {
    setPartyFilter(null);
    setConstituencyFilter(null);
    setSortBy("mostEffective");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <SiteHeader />

      <main className="page-container py-8 space-y-6">
        <header className="text-center space-y-2">
          <h1>Riksdagens ledamöter</h1>
          <p className="text-muted-foreground">
            Se vilka politiker som faktiskt får igenom sina förslag.
          </p>
        </header>

        {/* Weekly highlights - only show when no filters active */}
        {!hasActiveFilters && !searchQuery && politicians.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Notabla ledamöter
            </h2>
            <WeeklyHighlights politicians={politicians} />
          </section>
        )}

        <section className="space-y-3">
          {/* Primary filters: always visible */}
          <div className="flex flex-wrap items-center gap-2">
            <SearchFilter value={searchQuery} onChange={setSearchQuery} />
            <PartyFilter value={partyFilter} onChange={setPartyFilter} />
            <Button
              variant={showAdvancedFilters || hasActiveFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-9 gap-1.5"
            >
              <Filter className="size-3.5" />
              <span className="hidden sm:inline">Fler filter</span>
              {hasActiveFilters && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-muted-foreground"
              >
                Rensa filter
              </Button>
            )}
          </div>

          {/* Advanced filters: collapsible */}
          {showAdvancedFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-t border-b">
              <ConstituencyFilter
                value={constituencyFilter}
                onChange={setConstituencyFilter}
              />
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <SortFilter value={sortBy} onChange={setSortBy} />
            </div>
          )}
        </section>

        <section>
          {isLoading ? (
            <div className="card-grid-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PoliticianCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Kunde inte ladda politiker</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Okänt fel"}
              </p>
            </div>
          ) : politicians.length ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {politicians.length} politiker{hasNextPage ? "+" : ""}
                {constituencyFilter && ` i ${constituencyFilter}`}
              </p>
              <div className="card-grid-3">
                {politicians.map((p) => (
                  <PoliticianCardSimple
                    key={p.id}
                    politician={p}
                  />
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
