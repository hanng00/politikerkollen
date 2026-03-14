"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  HelpCircle,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfinitePromiseScores } from "@/hooks/useAccountability";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import { getAssessmentColor, getNarrative, getVerdictLabel } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

const PAGE_SIZE = 12;

function getAssessmentIcon(direction: string, size = "size-4") {
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

function PromiseScoreCardCompact({
  score,
  index,
}: {
  score: PromiseScore;
  index: number;
}) {
  const partyColor = getPartyColor(score.promise_party);
  const partyName = getPartyName(score.promise_party);
  const isContradiction = score.has_contradiction;
  const verdict = getVerdictLabel(score.evidence_direction);
  const assessmentColor = getAssessmentColor(score.evidence_direction);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 4) * 0.05, duration: 0.3 }}
    >
      <Link href={`/loften/${score.promise_id}`}>
        <Card
          className={`overflow-hidden h-full hover:ring-primary/20 transition-all cursor-pointer group ${isContradiction ? "ring ring-contrast-done/20" : ""}`}
        >
          <div className="h-1" style={{ backgroundColor: assessmentColor }} />
          <CardContent className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  style={{ borderColor: partyColor, color: partyColor }}
                >
                  {partyName} {score.promise_year}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY_NAMES[score.category] ?? score.category}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                {getAssessmentIcon(score.evidence_direction, "size-3.5")}
                <span className="text-xs font-medium">{verdict}</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed line-clamp-2">
              &ldquo;{score.promise_text}&rdquo;
            </p>

            <p className="text-xs text-muted-foreground line-clamp-2">
              {getNarrative(score)}
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {score.total_evidence_count} dokument
              </span>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export function PromiseFeed({
  selectedParty,
  selectedCategory,
}: {
  selectedParty: string;
  selectedCategory: string;
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
              key={`cards-${selectedParty}-${selectedCategory}`}
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
