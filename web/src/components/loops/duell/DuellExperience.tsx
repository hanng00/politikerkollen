"use client";

import { Check, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Counter, Reveal } from "@/components/motion";
import { FIXTURE_PROMISES } from "@/components/loops/_fixtures/promises";
import { ShareCardButton } from "@/components/share";
import { Button } from "@/components/ui/button";
import { usePromiseScores } from "@/hooks/useAccountability";
import { getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";
import { verdictStatus } from "@/lib/promise-verdict";
import { cn } from "@/lib/utils";
import type { PromiseScore } from "@/types";

import { buildDuellCard } from "./buildCard";

type Guess = "kept" | "broke";

interface DuelCard {
  id: string;
  party: string;
  text: string;
  truth: Guess;
  label: string;
}

function toDeck(promises: PromiseScore[]): DuelCard[] {
  return promises
    .map((p) => {
      const status = verdictStatus(p.evidence_direction, p.has_contradiction);
      return { id: p.promise_id, party: p.promise_party, text: p.promise_text, truth: status, label: p.assessment_label };
    })
    .filter((c): c is DuelCard => c.truth === "kept" || c.truth === "broke")
    .slice(0, 8);
}

function TopCard({
  card,
  onDecide,
  revealed,
  guess,
}: {
  card: DuelCard;
  onDecide: (g: Guess) => void;
  revealed: boolean;
  guess: Guess | null;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-12, 12]);
  const keptOpacity = useTransform(x, [20, 120], [0, 1]);
  const brokeOpacity = useTransform(x, [-120, -20], [1, 0]);
  const color = getPartyColor(card.party);

  const correct = revealed && guess === card.truth;

  return (
    <motion.div
      className="absolute inset-0"
      style={reduce ? undefined : { x, rotate }}
      drag={revealed || reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onDecide("kept");
        else if (info.offset.x < -100) onDecide("broke");
      }}
      whileTap={{ cursor: "grabbing" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card ring-1 ring-foreground/10 shadow-2xl">
        <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center gap-2">
            <span
              className="flex size-9 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: color, color: needsDarkText(card.party) ? "#000" : "#fff" }}
            >
              {card.party.toUpperCase()}
            </span>
            <span className="text-sm text-muted-foreground">{getPartyName(card.party)}</span>
          </div>

          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sa
          </p>
          <p className="mt-1 font-serif text-2xl leading-snug">
            &ldquo;{card.text}&rdquo;
          </p>

          <div className="mt-auto pt-4">
            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-xl border p-4",
                    correct ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
                  )}
                >
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", correct ? "text-success" : "text-destructive")}>
                    {correct ? <Check className="size-4" /> : <X className="size-4" />}
                    {correct ? "Rätt!" : "Fel."} De {card.truth === "kept" ? "höll" : "bröt"} löftet.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
                  <Link
                    href={`/loften/${card.id}`}
                    className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Se underlaget
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Swipe hint overlays */}
      {!revealed && !reduce && (
        <>
          <motion.div
            style={{ opacity: keptOpacity }}
            className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-success px-3 py-1 text-sm font-bold uppercase text-success"
          >
            Höll
          </motion.div>
          <motion.div
            style={{ opacity: brokeOpacity }}
            className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-destructive px-3 py-1 text-sm font-bold uppercase text-destructive"
          >
            Bröt
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

export function DuellExperience() {
  const { data } = usePromiseScores({ limit: 40 });
  const deck = useMemo(() => {
    const source = data?.data && data.data.length > 0 ? data.data : FIXTURE_PROMISES;
    return toDeck(source);
  }, [data]);

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<Guess | null>(null);

  const current = deck[index];
  const finished = deck.length > 0 && index >= deck.length;

  const decide = useCallback(
    (g: Guess) => {
      if (revealed || !current) return;
      setGuess(g);
      setRevealed(true);
      if (g === current.truth) setCorrect((c) => c + 1);
    },
    [revealed, current],
  );

  const next = useCallback(() => {
    setRevealed(false);
    setGuess(null);
    setIndex((i) => i + 1);
  }, []);

  const restart = useCallback(() => {
    setIndex(0);
    setCorrect(0);
    setRevealed(false);
    setGuess(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (!revealed) {
        if (e.key === "ArrowRight") decide("kept");
        if (e.key === "ArrowLeft") decide("broke");
      } else if (e.key === "Enter" || e.key === " ") {
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, revealed, decide, next]);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://politikerkollen.org/duell";

  return (
    <div className="page-container-narrow page-section">
      <Reveal className="mb-6 text-center" from="up">
        <h1 className="page-title">Spelar de roll?</h1>
        <p className="page-subtitle">
          De sa något. Gjorde de det? Svep höger om du tror att de höll löftet,
          vänster om du tror att de bröt det.
        </p>
      </Reveal>

      {!finished && current ? (
        <>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
            {/* faux stacked cards behind */}
            {deck[index + 1] && (
              <div className="absolute inset-0 translate-y-3 scale-[0.97] rounded-2xl border bg-card/60" />
            )}
            <AnimatePresence>
              <TopCard
                key={current.id}
                card={current}
                onDecide={decide}
                revealed={revealed}
                guess={guess}
              />
            </AnimatePresence>
          </div>

          <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-4">
            {!revealed ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => decide("broke")}
                >
                  <ThumbsDown className="size-4" /> Bröt
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 flex-1 border-success/40 text-success hover:bg-success/10"
                  onClick={() => decide("kept")}
                >
                  <ThumbsUp className="size-4" /> Höll
                </Button>
              </>
            ) : (
              <Button size="lg" className="h-12 flex-1" onClick={next}>
                Nästa
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {index + 1} / {deck.length} · {correct} rätt
          </p>
        </>
      ) : (
        <Reveal className="mx-auto max-w-sm text-center" from="up">
          <div className="rounded-2xl border bg-card p-8 ring-1 ring-foreground/5">
            <p className="text-sm text-muted-foreground">Ditt resultat</p>
            <div className="my-2 font-serif text-6xl font-semibold">
              <Counter value={correct} />
              <span className="text-muted-foreground">/{deck.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {deck.length > 0 && correct / deck.length >= 0.7
                ? "Du genomskådar retoriken."
                : "Svårare än man tror, eller hur?"}
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <ShareCardButton
                card={buildDuellCard(correct, deck.length)}
                text={`Jag fick ${correct}/${deck.length} rätt i "Spelar de roll?". Slå mig:`}
                url={shareUrl}
                label="Dela resultatet"
                filename="spelar-de-roll"
              />
              <Button variant="ghost" size="lg" className="h-9" onClick={restart}>
                <RotateCcw className="size-4" /> Spela igen
              </Button>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
