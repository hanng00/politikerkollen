"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Link2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromise } from "@/hooks/useAccountability";
import {
  CATEGORY_NAMES,
  getPartyColor,
  getPartyName,
} from "@/lib/parties";
import type { AccountabilityCard, PromiseMotion } from "@/types";

function sndUrl(documentId: string): string | null {
  const parts = documentId.split("-");
  if (parts.length < 3) return null;
  const partyId = parts[0];
  const year = parts[1];
  const typeId = parts.slice(2).join("_");
  return `https://snd.se/sv/vivill/party/${partyId}/${typeId}/${year}`;
}


function SharePreviewContent({
  promise,
  partyName,
  copied,
}: {
  promise: AccountabilityCard;
  partyName: string;
  copied: boolean;
}) {
  const bestMotion = promise.motions[0];
  const voteLabel =
    bestMotion?.promise_party_vote === "Ja"
      ? "röstade för"
      : bestMotion?.promise_party_vote === "Nej"
        ? "röstade emot"
        : null;

  const title = promise.has_contradiction
    ? `${partyName}: Motsägelse`
    : `${partyName}: Löfte ${promise.promise_year}`;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        Förhandsgranskning
      </p>
      <div className="rounded-md border bg-background overflow-hidden">
        <div className="px-3 py-2.5 space-y-1">
          <p className="text-[10px] text-muted-foreground">
            politikerkollen.se
          </p>
          <p className="font-semibold text-xs leading-snug">{title}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Sa: &ldquo;{promise.promise_text}&rdquo;
            {voteLabel && <> Gjorde: {partyName} {voteLabel}.</>}
            {bestMotion && <> Bevis: {bestMotion.source_titel}</>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {copied ? (
          <Check className="size-3.5 text-green-500 shrink-0" />
        ) : (
          <Link2 className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-muted-foreground">
          {copied
            ? "Länk kopierad — klistra in var du vill"
            : "Klicka för att kopiera länken"}
        </span>
      </div>
    </div>
  );
}

function VerdictSummary({
  motions,
  partyName,
}: {
  motions: PromiseMotion[];
  partyName: string;
}) {
  const withVotes = motions.filter((m) => m.votering_id);
  if (withVotes.length < 2) return null;

  const contradictions = withVotes.filter(
    (m) =>
      m.accountability_status === "opposed_passed" ||
      m.accountability_status === "opposed_failed",
  );
  const aligned = withVotes.length - contradictions.length;
  const alignedPct = (aligned / withVotes.length) * 100;

  const label =
    contradictions.length === 0
      ? `${partyName} röstade i linje med löftet i alla ${withVotes.length} omröstningar`
      : aligned === 0
        ? `${partyName} röstade emot löftet i alla ${withVotes.length} omröstningar`
        : `${partyName} röstade i linje med löftet ${aligned} av ${withVotes.length} gånger`;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {aligned} / {withVotes.length}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
        {alignedPct > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${alignedPct}%` }}
          />
        )}
        {alignedPct < 100 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${100 - alignedPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {aligned > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-green-500" />
            I linje ({aligned})
          </span>
        )}
        {contradictions.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500" />
            Motsägelse ({contradictions.length})
          </span>
        )}
      </div>
    </div>
  );
}

function MotionCard({
  motion: m,
  partyName,
  index,
}: {
  motion: PromiseMotion;
  partyName: string;
  index: number;
}) {
  const isContradiction =
    m.accountability_status === "opposed_passed" ||
    m.accountability_status === "opposed_failed";

  const voteIcon =
    m.promise_party_vote === "Ja" ? (
      <ThumbsUp className="size-4 text-green-600" />
    ) : m.promise_party_vote === "Nej" ? (
      <ThumbsDown className="size-4 text-red-600" />
    ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  <FileText className="size-3 mr-1" />
                  {m.source_dok_typ === "mot" ? "Motion" : "Proposition"}
                </Badge>
                <Badge variant="secondary">
                  {Math.round(m.similarity_score * 100)}% matchning
                </Badge>
                {isContradiction && (
                  <Badge variant="destructive">
                    <AlertTriangle className="size-3 mr-1" />
                    Motsägelse
                  </Badge>
                )}
              </div>
              <h3 className="font-medium">{m.source_titel}</h3>
              {m.punkt_rubrik && (
                <p className="text-sm text-muted-foreground">
                  Punkt {m.punkt}: {m.punkt_rubrik}
                </p>
              )}
            </div>
            {m.source_url && (
              <a
                href={m.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground shrink-0 p-2"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>

          {m.votering_id && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {voteIcon}
                  <span className="font-medium">
                    {partyName} röstade{" "}
                    <span
                      className={
                        m.promise_party_vote === "Ja"
                          ? "text-green-600"
                          : m.promise_party_vote === "Nej"
                            ? "text-red-600"
                            : "text-muted-foreground"
                      }
                    >
                      {m.promise_party_vote ?? "okänt"}
                    </span>
                  </span>
                </div>
                <Badge
                  variant={
                    m.riksdag_outcome === "Bifall" ? "default" : "secondary"
                  }
                >
                  {m.riksdag_outcome ?? "Okänt utfall"}
                </Badge>
              </div>

              {m.ja_count !== null && m.nej_count !== null && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>{m.ja_count} Ja</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>{m.nej_count} Nej</span>
                  </div>
                  {m.ja_count + m.nej_count > 0 && (
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(m.ja_count / (m.ja_count + m.nej_count)) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {isContradiction && (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium pt-2 border-t border-muted">
                  <AlertTriangle className="size-4" />
                  <span>
                    Partiet röstade mot detta förslag trots liknande vallöfte
                  </span>
                </div>
              )}
            </div>
          )}

          {!m.votering_id && (
            <p className="text-sm text-muted-foreground">
              Ingen röstning kopplad till denna motion
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PromiseDetailClient({
  id,
}: {
  id: string;
}) {
  const { data: promise, isLoading, error } = usePromise(id);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const partyColor = promise
    ? getPartyColor(promise.promise_party)
    : "#6366f1";
  const partyName = promise
    ? getPartyName(promise.promise_party)
    : "";
  const categoryName = promise
    ? (CATEGORY_NAMES[promise.category] ?? promise.category)
    : "";

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setShareOpen(true);
    setTimeout(() => setCopied(false), 3000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="py-8 md:py-12">
          <div className="page-container max-w-3xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4"
                  nativeButton={false}
                  render={<Link href="/" />}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Tillbaka
                </Button>
                <Popover open={shareOpen} onOpenChange={setShareOpen}>
                  <PopoverTrigger
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground mb-4 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Link2 className="size-4" />
                    )}
                    {copied ? "Kopierad!" : "Dela"}
                  </PopoverTrigger>
                  {promise && (
                    <PopoverContent align="end" side="bottom" sideOffset={8} className="w-80">
                      <SharePreviewContent
                        promise={promise}
                        partyName={partyName}
                        copied={copied}
                      />
                    </PopoverContent>
                  )}
                </Popover>
              </div>

              {isLoading ? (
                <LoadingSkeleton />
              ) : error ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-destructive/50">
                    <CardContent className="text-center py-12">
                      <p className="text-destructive font-medium">
                        {error instanceof Error
                          ? error.message
                          : "Ett fel uppstod"}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        nativeButton={false}
                        render={<Link href="/" />}
                      >
                        Gå tillbaka
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : promise ? (
                <>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="overflow-hidden">
                      <div
                        className="h-2"
                        style={{ backgroundColor: partyColor }}
                      />
                      <CardHeader>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
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
                          <span className="text-muted-foreground text-sm">
                            Valmanifest {promise.promise_year}
                          </span>
                          {promise.has_contradiction && (
                            <Badge variant="destructive">
                              <AlertTriangle className="size-3 mr-1" />
                              Innehåller motsägelser
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl font-medium leading-relaxed">
                          {promise.promise_text}
                        </CardTitle>
                      </CardHeader>
                      {promise.source_quote &&
                        promise.source_quote !== promise.promise_text && (
                          <CardContent className="pt-0">
                            <div className="border-l-2 border-muted pl-4">
                              <p className="text-sm text-muted-foreground italic">
                                &ldquo;{promise.source_quote}&rdquo;
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                — Originalcitat från valmanifest
                              </p>
                            </div>
                          </CardContent>
                        )}
                      <CardContent className={promise.source_quote && promise.source_quote !== promise.promise_text ? "pt-0" : ""}>
                        {(() => {
                          const url = sndUrl(promise.document_id);
                          if (!url) return null;
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="size-3.5" />
                              Läs hela valmanifestet på SND
                            </a>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium">
                        Relaterade motioner & röstningar
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {promise.motion_count}{" "}
                        {promise.motion_count === 1 ? "träff" : "träffar"}
                      </span>
                    </div>

                    <VerdictSummary
                      motions={promise.motions}
                      partyName={partyName}
                    />

                    {promise.motions.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8">
                          <p className="text-muted-foreground">
                            Inga relaterade motioner hittades för detta löfte.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {promise.motions.map((m, index) => (
                          <MotionCard
                            key={m.match_id}
                            motion={m}
                            partyName={partyName}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              ) : null}
            </div>
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
