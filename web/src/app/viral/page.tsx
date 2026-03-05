"use client";

import { ArrowRight, CheckCircle2, Search, Vote, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, fadeInUp, staggerContainer } from "@/lib/animations";
import { getPartyColor } from "@/lib/parties";
import {
  useSearchPoliticians,
  type PoliticianSearchResult,
} from "@/hooks/useSearchPoliticians";

const EXAMPLE_QUERIES = [
  "Sänka skatten på bensin",
  "Mer kärnkraft i Sverige",
  "Strängare straff för gängkriminalitet",
  "Höja pensionerna",
  "Stoppa vindkraftsutbyggnaden",
];

function PoliticianCard({
  politician,
  index,
}: {
  politician: PoliticianSearchResult;
  index: number;
}) {
  const partyColor = getPartyColor(politician.party);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      <Link href={`/politiker/${politician.intressent_id}`}>
        <Card className="hover:ring-primary/20 transition-all cursor-pointer group">
          <CardContent className="flex items-center gap-4">
            <div className="relative">
              <Avatar size="lg">
                {politician.image_url ? (
                  <AvatarImage src={politician.image_url} alt={politician.name} />
                ) : (
                  <AvatarFallback>
                    {politician.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div
                className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full ring-2 ring-card"
                style={{ backgroundColor: partyColor }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {politician.name}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {politician.party}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs truncate">
                {politician.constituency ?? "Okänd valkrets"}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-semibold text-primary">
                {politician.score.toFixed(1)}
              </div>
              <p className="text-muted-foreground text-xs">poäng</p>
            </div>
          </CardContent>

          <CardContent className="pt-0">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Vote className="size-3" />
                <span>{politician.evidence.votes_for} röster för</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                <span>{politician.evidence.motions_authored} motioner</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function LoadingResults() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex items-center gap-3 text-destructive">
        <AlertCircle className="size-5 shrink-0" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

function NoResults() {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <p className="text-muted-foreground">
          Inga politiker hittades för denna sökning.
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Prova att formulera din fråga på ett annat sätt.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ViralPage() {
  const [query, setQuery] = useState("");
  const { mutate: search, data, isPending, error } = useSearchPoliticians();

  const handleSearch = (searchQuery?: string) => {
    const q = searchQuery ?? query;
    if (!q.trim()) return;

    setQuery(q);
    search({ query: q, limit: 20, riksmote_year: 2024 });
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  const results = data?.results ?? [];
  const metadata = data?.metadata;
  const hasSearched = data !== undefined || error !== null;

  const totalVotesFor = results.reduce((acc, p) => acc + p.evidence.votes_for, 0);
  const totalMotions = results.reduce((acc, p) => acc + p.evidence.motions_authored, 0);

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

      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex items-center justify-center px-4 py-12 md:py-20 relative">
          <div className="absolute inset-0 pattern-grid-subtle" />

          <motion.div
            className="page-container-narrow relative z-10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="text-center space-y-4 mb-8" variants={fadeIn}>
              <h1 className="text-balance">
                Se vilka politiker som faktiskt röstat för det du bryr dig om
              </h1>
              <p className="page-subtitle">
                Inte vad de säger. Vad de gör.
                <br />
                <span className="text-foreground">
                  Varje röst, motion och tal – spårbart.
                </span>
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Vad vill du att politikerna ska göra?"
                  className="w-full h-12 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
                />
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => handleSearch()}
                  disabled={!query.trim() || isPending}
                  className="min-w-[200px]"
                >
                  {isPending ? (
                    "Söker..."
                  ) : (
                    <>
                      Visa politiker
                      <ArrowRight className="size-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              {!hasSearched && (
                <motion.div
                  variants={fadeInUp}
                  className="pt-4"
                >
                  <p className="text-center text-muted-foreground text-xs mb-3">
                    Prova till exempel:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {EXAMPLE_QUERIES.map((example) => (
                      <button
                        key={example}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {hasSearched && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-10"
                >
                  {query && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Politiker som agerat för:{" "}
                        <span className="text-foreground font-medium">
                          &ldquo;{query}&rdquo;
                        </span>
                      </p>
                    </div>
                  )}

                  {isPending ? (
                    <LoadingResults />
                  ) : error ? (
                    <ErrorMessage message={error instanceof Error ? error.message : "Ett oväntat fel uppstod"} />
                  ) : results.length === 0 ? (
                    <NoResults />
                  ) : (
                    <div className="space-y-3">
                      {results.map((politician, index) => (
                        <PoliticianCard
                          key={politician.intressent_id}
                          politician={politician}
                          index={index}
                        />
                      ))}

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="pt-4 text-center"
                      >
                        <p className="text-xs text-muted-foreground mb-3">
                          Baserat på {totalVotesFor} röster för och{" "}
                          {totalMotions} motioner i riksdagen
                          {metadata && (
                            <span className="block mt-1">
                              ({metadata.total_matches} matchande dokument, {metadata.search_time_ms}ms)
                            </span>
                          )}
                        </p>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

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
      </main>
    </div>
  );
}
