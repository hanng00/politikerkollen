"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter, Loader2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  PeriodFilter,
  getDateRangeFromPeriod,
  SortFilter,
} from "@/components/politiker/filters";
import {
  useDebounce,
  useInfiniteFetchPoliticians,
  type SortOption,
} from "@/hooks";

const SORT_OPTIONS: SortOption[] = ["mostEffective", "name", "mostActive", "mostVotes", "mostSpeeches", "mostRebel"];

function isValidSortOption(value: string | null): value is SortOption {
  return value !== null && SORT_OPTIONS.includes(value as SortOption);
}

export default function PoliticiansPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL is the source of truth for filters
  const partyFilter = searchParams.get("parti");
  const constituencyFilter = searchParams.get("valkrets");
  const sortParam = searchParams.get("sortera");
  const sortBy: SortOption = isValidSortOption(sortParam) ? sortParam : "mostEffective";
  const periodFilter = searchParams.get("period") ?? "all";
  const customFromDate = searchParams.get("fran") ?? "";
  const customToDate = searchParams.get("till") ?? "";
  const useCustomDates = customFromDate !== "" || customToDate !== "";
  const urlSearch = searchParams.get("sok") ?? "";

  // Local state only for the search input (for responsive typing)
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("sok", debouncedSearch);
    } else {
      params.delete("sok");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advanced filters panel state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    constituencyFilter !== null || periodFilter !== "all" || customFromDate !== "" || customToDate !== "" || (sortParam !== null && sortParam !== "mostEffective")
  );

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all" || (key === "sortera" && value === "mostEffective")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const dateRange = useMemo(
    () => getDateRangeFromPeriod(periodFilter, customFromDate, customToDate, useCustomDates),
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
    search: urlSearch || undefined,
    party: partyFilter ?? undefined,
    constituency: constituencyFilter ?? undefined,
    sortBy,
    limit: 30,
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  const politicians = useMemo(() => {
    if (!data?.pages) return [];
    const all = data.pages.flatMap((page) => page.data);
    const seen = new Set<string>();
    return all.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
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
    sortBy !== "mostEffective" ||
    periodFilter !== "all" ||
    useCustomDates;

  const clearFilters = useCallback(() => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

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

        {!hasActiveFilters && !urlSearch && politicians.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Notabla ledamöter
            </h2>
            <WeeklyHighlights politicians={politicians} />
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchFilter value={searchInput} onChange={setSearchInput} />
            <PartyFilter value={partyFilter} onChange={(v) => updateParams({ parti: v })} />
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

          {showAdvancedFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-t border-b">
              <PeriodFilter
                periodFilter={periodFilter}
                onPeriodChange={(v) => {
                  if (v !== "custom") {
                    updateParams({ period: v, fran: null, till: null });
                  } else {
                    updateParams({ period: v });
                  }
                }}
                customFromDate={customFromDate}
                customToDate={customToDate}
                onCustomFromDateChange={(v) => updateParams({ fran: v, period: "custom" })}
                onCustomToDateChange={(v) => updateParams({ till: v, period: "custom" })}
                useCustomDates={useCustomDates}
                onUseCustomDatesChange={(v) => {
                  if (!v) {
                    updateParams({ fran: null, till: null, period: periodFilter === "custom" ? "all" : periodFilter });
                  }
                }}
              />
              <ConstituencyFilter
                value={constituencyFilter}
                onChange={(v) => updateParams({ valkrets: v })}
              />
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <SortFilter value={sortBy} onChange={(v) => updateParams({ sortera: v })} />
            </div>
          )}
        </section>

        <section>
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Kunde inte ladda politiker</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Okänt fel"}
              </p>
            </div>
          ) : isLoading ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Laddar politiker...
              </p>
              <div className="card-grid-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <PoliticianCardSkeleton key={i} />
                ))}
              </div>
            </>
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
