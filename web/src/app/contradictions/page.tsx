"use client";

import {
  AlertTriangle,
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  Filter,
  ChevronRight,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import { useAccountabilityCards, useAccountabilityFilters } from "@/hooks/useAccountability";
import type { AccountabilityCard, PromiseMotion } from "@/types";

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

function MotionItem({ motion: m, partyName }: { motion: PromiseMotion; partyName: string }) {
  const isContradiction =
    m.accountability_status === "opposed_passed" ||
    m.accountability_status === "opposed_failed";

  const voteIcon =
    m.promise_party_vote === "Ja" ? (
      <ThumbsUp className="size-3 text-green-600" />
    ) : m.promise_party_vote === "Nej" ? (
      <ThumbsDown className="size-3 text-red-600" />
    ) : null;

  return (
    <div className="border-l-2 border-muted pl-3 py-2 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {m.source_dok_typ === "mot" ? "Motion" : "Proposition"}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(m.similarity_score * 100)}%
            </span>
          </div>
          <p className="text-sm truncate">{m.source_titel}</p>
        </div>
        {m.source_url && (
          <a
            href={m.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {m.votering_id && m.promise_party_vote && (
        <div className="flex items-center gap-2 text-xs">
          {voteIcon}
          <span>
            {partyName} röstade{" "}
            <span
              className={
                m.promise_party_vote === "Ja"
                  ? "text-green-600 font-medium"
                  : m.promise_party_vote === "Nej"
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
              }
            >
              {m.promise_party_vote}
            </span>
          </span>
          <span className="text-muted-foreground">→</span>
          <Badge variant={m.riksdag_outcome === "Bifall" ? "default" : "secondary"} className="text-[10px] h-4">
            {m.riksdag_outcome}
          </Badge>
          {isContradiction && (
            <AlertTriangle className="size-3 text-amber-600" />
          )}
        </div>
      )}

      {m.votering_id && !m.promise_party_vote && (
        <p className="text-xs text-muted-foreground">Röstdata saknas</p>
      )}
    </div>
  );
}

function AccountabilityCardComponent({
  card,
  index,
}: {
  card: AccountabilityCard;
  index: number;
}) {
  const partyColor = PARTY_COLORS[card.promise_party] ?? "#6366f1";
  const partyName = PARTY_NAMES[card.promise_party] ?? card.promise_party.toUpperCase();
  const categoryName = CATEGORY_NAMES[card.category] ?? card.category;

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
                <span className="text-muted-foreground text-xs">{card.promise_year}</span>
                {card.has_contradiction && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="size-3 mr-1" />
                    Motsägelse
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground">
                {card.motion_count} {card.motion_count === 1 ? "motion" : "motioner"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Löfte från valmanifest
            </p>
            <p className="text-sm leading-relaxed">{card.promise_text}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Relaterade motioner & röstningar
            </p>
            <div className="space-y-0">
              {card.motions.slice(0, 3).map((m) => (
                <MotionItem key={m.match_id} motion={m} partyName={partyName} />
              ))}
              {card.motions.length > 3 && (
                <p className="text-xs text-muted-foreground pl-3 pt-2">
                  + {card.motions.length - 3} fler motioner
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-xs" nativeButton={false} render={<Link href={`/loften/${card.promise_id}`} />}>
              Visa alla detaljer
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
        <p className="text-muted-foreground">Inga matchningar hittades med dessa filter.</p>
        <p className="text-muted-foreground text-sm mt-1">
          Prova att ändra filter eller sänka matchningströskeln.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ContradictionsPage() {
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
    limit: 20,
  });

  const cards = response?.data ?? [];
  const total = response?.meta.total ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-3">
        <div className="page-container flex items-center justify-between">
          <Link href="/" className="font-serif text-lg font-medium">
            Politikerkollen
          </Link>
          <Badge variant="secondary">Beta</Badge>
        </div>
      </header>

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
                  Se hur partiernas vallöften förhåller sig till hur de faktiskt röstat i
                  riksdagen. Varje koppling är spårbar till källdokument.
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

                <Select value={selectedParty} onValueChange={(v) => setSelectedParty(v ?? "all")}>
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

                <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? "all")}>
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
                  Visar {cards.length} av {total} löften
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
                      <AccountabilityCardComponent key={card.promise_id} card={card} index={index} />
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
          <p className="text-sm">Ett verktyg för demokratiskt ansvarsutkrävande.</p>
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
