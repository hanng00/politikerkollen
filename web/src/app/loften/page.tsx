"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Filter,
  HelpCircle,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getAssessmentColor, getNarrative, getVerdictLabel } from "@/lib/promise-narratives";
import type { PromiseScore } from "@/types";

function getAssessmentIcon(direction: string) {
  switch (direction) {
    case "acted":
      return <CheckCircle2 className="size-4 text-success" />;
    case "some_action":
      return <CircleDot className="size-4 text-success" />;
    case "mixed":
      return <HelpCircle className="size-4 text-warning" />;
    case "some_inaction":
      return <MinusCircle className="size-4 text-orange-500" />;
    case "contradiction":
      return <XCircle className="size-4 text-destructive" />;
    default:
      return <HelpCircle className="size-4 text-muted-foreground" />;
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
      transition={{ delay: index * 0.05, duration: 0.3 }}
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
                {getAssessmentIcon(score.evidence_direction)}
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
                {score.proposition_count +
                  score.motion_bifall_count +
                  score.motion_supported_count +
                  score.motion_opposed_count}{" "}
                riksdagsbeslut
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
    <div className="grid gap-4 md:grid-cols-2">
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

function LoftenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedParty = searchParams.get("party") || "all";
  const selectedCategory = searchParams.get("category") || "all";
  const selectedDirection = searchParams.get("direction") || "all";

  const updateUrl = useCallback(
    (party: string, category: string, direction: string) => {
      const params = new URLSearchParams();
      if (party !== "all") params.set("party", party);
      if (category !== "all") params.set("category", category);
      if (direction !== "all") params.set("direction", direction);
      const queryString = params.toString();
      router.push(queryString ? `/loften?${queryString}` : "/loften", {
        scroll: false,
      });
    },
    [router],
  );

  const handlePartyChange = useCallback(
    (value: string | null) => {
      updateUrl(value ?? "all", selectedCategory, selectedDirection);
    },
    [selectedCategory, selectedDirection, updateUrl],
  );

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      updateUrl(selectedParty, value ?? "all", selectedDirection);
    },
    [selectedParty, selectedDirection, updateUrl],
  );

  const handleDirectionChange = useCallback(
    (value: string | null) => {
      updateUrl(selectedParty, selectedCategory, value ?? "all");
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
    limit: 50,
  });

  const scores = response?.data ?? [];
  const total = response?.meta.total ?? 0;

  return (
    <section className="py-12 md:py-16">
      <div className="page-container">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={fadeIn} className="text-center space-y-4">
            <h1 className="text-balance">Löften vs Verklighet</h1>
            <p className="page-subtitle max-w-2xl mx-auto">
              Varje vallöfte kopplat till faktiskt agerande i riksdagen.
              Spårbart till källdokument.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>

            <Select value={selectedParty} onValueChange={handlePartyChange}>
              <SelectTrigger className="w-[160px]">
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

            <Select
              value={selectedCategory}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-[160px]">
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

            <Select
              value={selectedDirection}
              onValueChange={handleDirectionChange}
            >
              <SelectTrigger className="w-[160px]">
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
                <SelectItem value="contradiction">Röstat emot</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {!isLoading && !error && (
            <motion.p
              variants={fadeIn}
              className="text-center text-sm text-muted-foreground"
            >
              Visar {scores.length} av {total} löften
            </motion.p>
          )}

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
                className="grid gap-4 md:grid-cols-2"
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
        </motion.div>
      </div>
    </section>
  );
}

export default function LoftenPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Suspense fallback={<LoadingCards />}>
          <LoftenContent />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
