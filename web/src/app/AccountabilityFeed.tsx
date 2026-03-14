"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  HelpCircle,
  MinusCircle,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountabilityFilters,
  usePromiseScores,
} from "@/hooks/useAccountability";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import { CATEGORY_NAMES, getPartyColor, getPartyName } from "@/lib/parties";
import { getNarrative, getVerdictLabel } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

const PAGE_SIZE = 8;

function getAssessmentIcon(direction: string, size = "size-4") {
  switch (direction) {
    case "acted":
      return <CheckCircle2 className={`${size} text-success`} />;
    case "some_action":
      return <CircleDot className={`${size} text-success`} />;
    case "mixed":
      return <HelpCircle className={`${size} text-warning`} />;
    case "some_inaction":
      return <MinusCircle className={`${size} text-orange-500`} />;
    case "contradiction":
      return <XCircle className={`${size} text-destructive`} />;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/loften/${score.promise_id}`}>
        <Card
          className={`overflow-hidden h-full hover:ring-primary/20 transition-all cursor-pointer group ${isContradiction ? "ring ring-contrast-done/20" : ""}`}
        >
          <div className="h-1" style={{ backgroundColor: partyColor }} />
          <CardContent className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge
                variant="outline"
                style={{ borderColor: partyColor, color: partyColor }}
              >
                {partyName} {score.promise_year}
              </Badge>
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

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <div className="h-1 bg-muted" />
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <p className="text-muted-foreground">
          Inga löften hittades med dessa filter.
        </p>
      </CardContent>
    </Card>
  );
}

interface AccountabilityFeedProps {
  title?: string;
  subtitle?: string;
  showAllLink?: boolean;
}

export function AccountabilityFeed({
  title = "Löften i detalj",
  subtitle,
  showAllLink,
}: AccountabilityFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialParty = searchParams.get("party") || "all";
  const initialCategory = searchParams.get("category") || "all";
  const initialDirection = searchParams.get("direction") || "all";

  const [selectedParty, setSelectedParty] = useState(initialParty);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDirection, setSelectedDirection] = useState(initialDirection);

  const updateUrl = useCallback(
    (party: string, category: string, direction: string) => {
      const params = new URLSearchParams();
      if (party !== "all") params.set("party", party);
      if (category !== "all") params.set("category", category);
      if (direction !== "all") params.set("direction", direction);
      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : "/", { scroll: false });
    },
    [router],
  );

  const handlePartyChange = useCallback(
    (value: string | null) => {
      const v = value ?? "all";
      setSelectedParty(v);
      updateUrl(v, selectedCategory, selectedDirection);
    },
    [selectedCategory, selectedDirection, updateUrl],
  );

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      const v = value ?? "all";
      setSelectedCategory(v);
      updateUrl(selectedParty, v, selectedDirection);
    },
    [selectedParty, selectedDirection, updateUrl],
  );

  const handleDirectionChange = useCallback(
    (value: string | null) => {
      const v = value ?? "all";
      setSelectedDirection(v);
      updateUrl(selectedParty, selectedCategory, v);
    },
    [selectedParty, selectedCategory, updateUrl],
  );

  const { data: filters } = useAccountabilityFilters();
  const {
    data: response,
    isLoading,
    error,
  } = usePromiseScores({
    party: selectedParty !== "all" ? selectedParty : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    evidence_direction:
      selectedDirection !== "all" ? selectedDirection : undefined,
    limit: PAGE_SIZE,
  });

  const scores = response?.data ?? [];
  const total = response?.meta.total ?? 0;

  const hasActiveFilters =
    selectedParty !== "all" ||
    selectedCategory !== "all" ||
    selectedDirection !== "all";

  return (
    <section className="py-10 md:py-14">
      <div className="page-container">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">{title}</h2>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {total} löften
                </Badge>
              )}
            </div>

            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="size-4" />
                    Filter
                    {hasActiveFilters && (
                      <Badge
                        variant="default"
                        className="size-5 p-0 justify-center"
                      >
                        {
                          [
                            selectedParty,
                            selectedCategory,
                            selectedDirection,
                          ].filter((v) => v !== "all").length
                        }
                      </Badge>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parti</label>
                    <Select
                      value={selectedParty}
                      onValueChange={handlePartyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alla partier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla partier</SelectItem>
                        {filters?.parties.map((party) => (
                          <SelectItem key={party} value={party}>
                            {getPartyName(party)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kategori</label>
                    <Select
                      value={selectedCategory}
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alla kategorier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla kategorier</SelectItem>
                        {filters?.categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {CATEGORY_NAMES[category] ?? category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bedömning</label>
                    <Select
                      value={selectedDirection}
                      onValueChange={handleDirectionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alla bedömningar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla bedömningar</SelectItem>
                        <SelectItem value="acted">Aktivt drivit</SelectItem>
                        <SelectItem value="some_action">Tagit steg</SelectItem>
                        <SelectItem value="mixed">Blandat</SelectItem>
                        <SelectItem value="some_inaction">
                          Begränsat engagemang
                        </SelectItem>
                        <SelectItem value="contradiction">
                          Röstat emot
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedParty("all");
                        setSelectedCategory("all");
                        setSelectedDirection("all");
                        updateUrl("all", "all", "all");
                      }}
                    >
                      Rensa filter
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingCards />
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
            ) : scores.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState />
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {scores.map((score, index) => (
                  <PromiseScoreCardCompact
                    key={score.promise_id}
                    score={score}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {showAllLink && scores.length > 0 && scores.length < total && (
            <motion.div variants={fadeIn} className="text-center">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/loften" />}
              >
                Visa alla {total} löften
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
