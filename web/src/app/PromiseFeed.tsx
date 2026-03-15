"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

import { PromiseScoreCardCompact } from "@/components/promises/PromiseScoreCardCompact";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfinitePromiseScores } from "@/hooks/useAccountability";
import type { OutcomeFilter } from "./PromiseFilters";

const PAGE_SIZE = 12;

export function PromiseFeed({
  selectedParty,
  selectedCategory,
  selectedOutcome,
}: {
  selectedParty: string;
  selectedCategory: string;
  selectedOutcome: OutcomeFilter;
}) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePromiseScores({
    party: selectedParty !== "all" ? selectedParty : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    outcome: selectedOutcome !== "all" ? selectedOutcome : undefined,
    limit: PAGE_SIZE,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const scores = data?.pages.flatMap((p) => p.data) ?? [];
  const uniqueScores = scores.filter(
    (score, index, self) =>
      index === self.findIndex((s) => s.promise_id === score.promise_id)
  );
  const total = data?.pages[0]?.meta.total ?? 0;

  return (
    <section className="py-6 md:py-10">
      <div className="page-container space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium shrink-0">Löften i detalj</h2>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs">
              {total}
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <div className="h-1 bg-muted" />
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-destructive/50">
                <CardContent className="text-center py-8 text-destructive">
                  {error instanceof Error ? error.message : "Ett fel uppstod"}
                </CardContent>
              </Card>
            </motion.div>
          ) : uniqueScores.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">
                    Inga matchningar hittades med dessa filter.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={`cards-${selectedParty}-${selectedCategory}-${selectedOutcome}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {uniqueScores.map((score, index) => (
                <PromiseScoreCardCompact
                  key={score.promise_id}
                  score={score}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="h-px" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </section>
  );
}
