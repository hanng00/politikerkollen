"use client";

import {
  AlertTriangle,
  ChevronRight,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useAccountabilityCards,
  useAccountabilityFilters,
} from "@/hooks/useAccountability";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import {
  CATEGORY_NAMES,
  getPartyColor,
  getPartyName,
  PARTY_ABBREVS,
  PARTY_COLORS,
} from "@/lib/parties";
import type { AccountabilityCard } from "@/types";

const PAGE_SIZE = 8;

function AccountabilityCardComponent({
  card,
  index,
}: {
  card: AccountabilityCard;
  index: number;
}) {
  const partyColor = getPartyColor(card.promise_party);
  const partyName = getPartyName(card.promise_party);

  const bestMotion = card.motions[0];
  const isContradiction = card.has_contradiction;

  const voteLabel =
    bestMotion?.promise_party_vote === "Ja"
      ? "röstade för"
      : bestMotion?.promise_party_vote === "Nej"
        ? "röstade emot"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/loften/${card.promise_id}`}>
        <Card className={`overflow-hidden h-full hover:ring-primary/20 transition-all cursor-pointer group ${isContradiction ? "ring ring-contrast-done/20" : ""}`}>
          <div className="h-1" style={{ backgroundColor: partyColor }} />
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                style={{ borderColor: partyColor, color: partyColor }}
              >
                {partyName} {card.promise_year}
              </Badge>
              {isContradiction && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Motsägelse
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Sa</p>
                <p className="text-sm leading-relaxed line-clamp-2">
                  &ldquo;{card.promise_text}&rdquo;
                </p>
              </div>

              {bestMotion && voteLabel && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Gjorde</p>
                  <p className="text-sm leading-relaxed">
                    {bestMotion.promise_party_vote === "Ja" ? (
                      <ThumbsUp className="size-3.5 inline-block mr-1 text-success align-text-bottom" />
                    ) : (
                      <ThumbsDown className="size-3.5 inline-block mr-1 text-destructive align-text-bottom" />
                    )}
                    {partyName} {voteLabel}
                    {bestMotion.riksdag_outcome && (
                      <span className="text-muted-foreground"> · {bestMotion.riksdag_outcome}</span>
                    )}
                  </p>
                </div>
              )}

              {bestMotion && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Bevis</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {bestMotion.source_titel}
                    {card.motion_count > 1 && (
                      <span className="text-muted-foreground/60"> +{card.motion_count - 1} till</span>
                    )}
                  </p>
                </div>
              )}
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
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
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
          Inga matchningar hittades med dessa filter.
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Prova att ändra filter eller sänka matchningströskeln.
        </p>
      </CardContent>
    </Card>
  );
}

interface AccountabilityFeedProps {
  title: string;
  subtitle: string;
  showAllLink?: boolean;
}

export function AccountabilityFeed({
  title,
  subtitle,
  showAllLink = false,
}: AccountabilityFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedParty = searchParams.get("parti") ?? "all";
  const selectedCategory = searchParams.get("kategori") ?? "all";

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      setVisibleCount(PAGE_SIZE);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams],
  );

  const { data: filters } = useAccountabilityFilters();
  const {
    data: response,
    isLoading,
    error,
  } = useAccountabilityCards({
    party: selectedParty !== "all" ? selectedParty : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    limit: visibleCount,
  });

  const cards = response?.data ?? [];
  const total = response?.meta.total ?? 0;
  const hasMore = cards.length < total;

  const hasAdvancedFilters = selectedCategory !== "all";

  const partyToggleValue = useMemo(
    () => (selectedParty === "all" ? [] : [selectedParty]),
    [selectedParty],
  );

  return (
    <section className="py-10 md:py-14">
      <div className="page-container">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={fadeIn} className="text-center space-y-3">
            <h1 className="text-balance">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-1.5">
            <Button
              variant={selectedParty === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("parti", "all")}
            >
              Alla partier
            </Button>
            <ToggleGroup
              size="sm"
              variant="outline"
              spacing={2}
              value={partyToggleValue}
              onValueChange={(groupValue) => {
                setFilter("parti", groupValue.length > 0 ? groupValue[0] : "all");
              }}
            >
              {PARTY_ABBREVS.map((party) => {
                const color = PARTY_COLORS[party];
                const active = selectedParty === party;
                return (
                  <ToggleGroupItem
                    key={party}
                    value={party}
                    style={
                      active
                        ? { backgroundColor: color, borderColor: color, color: "#fff" }
                        : undefined
                    }
                  >
                    {party.toUpperCase()}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>

            <Popover>
              <PopoverTrigger
                className="inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-muted h-6 w-6 transition-colors cursor-pointer relative"
              >
                <SlidersHorizontal className="size-3" />
                {hasAdvancedFilters && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
                )}
              </PopoverTrigger>
              <PopoverContent align="center" side="bottom" sideOffset={8} className="w-56">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Filter</p>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Kategori</label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => setFilter("kategori", v ?? "all")}
                    >
                      <SelectTrigger className="w-full">
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
                  {hasAdvancedFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setFilter("kategori", "all")}
                    >
                      Rensa filter
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>

          {!isLoading && !error && total > 0 && (
            <motion.p
              variants={fadeIn}
              className="text-center text-sm text-muted-foreground"
            >
              Visar {cards.length} av {total} matchningar
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
            ) : cards.length === 0 ? (
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
                {cards.map((card, index) => (
                  <AccountabilityCardComponent
                    key={card.promise_id}
                    card={card}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {cards.length > 0 && (
            <motion.div variants={fadeInUp} className="text-center space-y-3">
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Visa mer
                </Button>
              )}
              {showAllLink && (
                <div className="space-y-1">
                  <Link href="/loften">
                    <Button variant="link">
                      Visa alla {total > 0 ? total : ""} matchningar
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
              {total > 0 && (
                <p className="text-xs text-muted-foreground">
                  Alla kopplingar är spårbara till riksdagens öppna data
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
