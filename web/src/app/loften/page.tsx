"use client";

import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Filter,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { SiteHeader } from "@/components/layout";
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
  useAccountabilityCards,
  useAccountabilityFilters,
} from "@/hooks/useAccountability";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import type { AccountabilityCard } from "@/types";

const PARTY_COLORS: Record<string, string> = {
  s: "#E8112D",
  m: "#52BDEC",
  sd: "#DDDD00",
  c: "#009933",
  v: "#DA291C",
  kd: "#000077",
  l: "#006AB3",
  mp: "#83CF39",
};

const PARTY_NAMES: Record<string, string> = {
  s: "Socialdemokraterna",
  m: "Moderaterna",
  sd: "Sverigedemokraterna",
  c: "Centerpartiet",
  v: "Vänsterpartiet",
  kd: "Kristdemokraterna",
  l: "Liberalerna",
  mp: "Miljöpartiet",
};

const CATEGORY_NAMES: Record<string, string> = {
  skatt: "Skatter",
  vard: "Vård & omsorg",
  skola: "Skola & utbildning",
  miljo: "Miljö & klimat",
  migration: "Migration",
  forsvar: "Försvar",
  rattsvasende: "Rättsväsende",
  arbetsmarknad: "Arbetsmarknad",
  bostader: "Bostäder",
  pension: "Pension",
  ovrigt: "Övrigt",
};

function ContradictionCardComponent({
  card,
  index,
}: {
  card: AccountabilityCard;
  index: number;
}) {
  const partyColor = PARTY_COLORS[card.promise_party] ?? "#6366f1";
  const partyName =
    PARTY_NAMES[card.promise_party] ?? card.promise_party.toUpperCase();
  const categoryName = CATEGORY_NAMES[card.category] ?? card.category;

  const isContradiction = card.has_contradiction;

  // Get the best motion for display (highest similarity)
  const bestMotion = card.motions[0];

  const voteIcon =
    bestMotion?.promise_party_vote === "Ja" ? (
      <ThumbsUp className="size-4 text-green-600" />
    ) : bestMotion?.promise_party_vote === "Nej" ? (
      <ThumbsDown className="size-4 text-red-600" />
    ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <div className="h-1" style={{ backgroundColor: partyColor }} />
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: partyColor,
                    color: partyColor,
                  }}
                >
                  {partyName}
                </Badge>
                <Badge variant="secondary">{categoryName}</Badge>
                <span className="text-muted-foreground text-xs">
                  {card.promise_year}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium text-muted-foreground">
                {Math.round(card.best_similarity_score * 100)}% match
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Löfte från valmanifest
              </p>
              <p className="text-sm leading-relaxed">{card.promise_text}</p>
            </div>

            {bestMotion && (
              <div className="border-l-2 border-muted pl-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Relaterad{" "}
                  {bestMotion.source_dok_typ === "mot" ? "motion" : "proposition"}
                  {card.motion_count > 1 && (
                    <span className="text-muted-foreground/70"> (+{card.motion_count - 1} till)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {bestMotion.source_titel}
                </p>
              </div>
            )}
          </div>

          {bestMotion?.votering_id && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {voteIcon}
                  <span className="text-sm font-medium">
                    {partyName} röstade{" "}
                    <span
                      className={
                        bestMotion.promise_party_vote === "Ja"
                          ? "text-green-600"
                          : bestMotion.promise_party_vote === "Nej"
                            ? "text-red-600"
                            : "text-muted-foreground"
                      }
                    >
                      {bestMotion.promise_party_vote}
                    </span>
                  </span>
                </div>
                <Badge
                  variant={
                    bestMotion.riksdag_outcome === "Bifall" ? "default" : "secondary"
                  }
                >
                  {bestMotion.riksdag_outcome}
                </Badge>
              </div>

              {bestMotion.ja_count !== null && bestMotion.nej_count !== null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-green-600">{bestMotion.ja_count} Ja</span>
                  <span>–</span>
                  <span className="text-red-600">{bestMotion.nej_count} Nej</span>
                </div>
              )}

              {isContradiction && (
                <div className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                  <AlertTriangle className="size-3" />
                  <span>Partiet röstade mot relaterat förslag</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {bestMotion?.source_url && (
              <a
                href={bestMotion.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="size-3" />
                Källa: riksdagen.se
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              nativeButton={false}
              render={<Link href={`/lofte/${card.promise_id}`} />}
            >
              Visa detaljer
              <ChevronRight className="size-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
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

export default function LoftenPage() {
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: filters } = useAccountabilityFilters();
  const {
    data: response,
    isLoading,
    error,
  } = useAccountabilityCards({
    party: selectedParty !== "all" ? selectedParty : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    limit: 50,
  });

  const cards = response?.data ?? [];
  const total = response?.meta.total ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
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
                  Se hur partiernas vallöften förhåller sig till hur de faktiskt
                  röstat i riksdagen. Varje koppling är spårbar till
                  källdokument.
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

                <Select
                  value={selectedParty}
                  onValueChange={(v) => setSelectedParty(v ?? "all")}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Alla partier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla partier</SelectItem>
                    {filters?.parties.map((party) => (
                      <SelectItem key={party} value={party}>
                        {PARTY_NAMES[party] ?? party.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedCategory}
                  onValueChange={(v) => setSelectedCategory(v ?? "all")}
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
              </motion.div>

              {!isLoading && !error && (
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
                        {error instanceof Error
                          ? error.message
                          : "Ett fel uppstod"}
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
                      <ContradictionCardComponent
                        key={card.promise_id}
                        card={card}
                        index={index}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="page-container text-center text-muted-foreground">
          <p className="text-sm">
            Ett verktyg för demokratiskt ansvarsutkrävande.
          </p>
          <p className="text-sm mt-1">
            Data från{" "}
            <a
              href="https://data.riksdagen.se"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Riksdagens öppna data
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
