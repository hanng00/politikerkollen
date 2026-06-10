"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Counter } from "@/components/motion";
import { ShareCardButton } from "@/components/share";
import { Button } from "@/components/ui/button";
import { getPartyColor } from "@/lib/parties";
import { gradeWord } from "@/lib/grades";
import { cn } from "@/lib/utils";

import { buildWrappedCard } from "./buildCard";
import type { WrappedData } from "./types";

const SLIDE_MS = 6000;

interface SlideDef {
  id: string;
  render: (d: WrappedData) => React.ReactNode;
}

const SLIDES: SlideDef[] = [
  {
    id: "intro",
    render: (d) => (
      <SlideShell>
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">
          Riksdagen Wrapped
        </p>
        <h2 className="mt-4 font-serif text-5xl font-semibold text-white">
          {d.subjectName}
        </h2>
        <p className="mt-4 max-w-xs text-white/80">
          Så här har mandatperioden sett ut — i siffror. Tryck för att fortsätta.
        </p>
      </SlideShell>
    ),
  },
  {
    id: "votes",
    render: (d) => (
      <SlideShell>
        <p className="text-white/70">Antal röster i kammaren</p>
        <div className="mt-2 font-serif text-7xl font-semibold text-white">
          <Counter value={d.stats.votes} duration={1.4} />
        </div>
        <p className="mt-4 text-white/70">
          Det är ungefär {Math.round(d.stats.votes / 200)} voteringar per vecka.
        </p>
        <Estimate estimated={d.estimatedFields.includes("votes")} />
      </SlideShell>
    ),
  },
  {
    id: "attendance",
    render: (d) => (
      <SlideShell>
        <p className="text-white/70">Närvaro vid voteringar</p>
        <div className="mt-2 font-serif text-7xl font-semibold text-white">
          <Counter value={d.stats.attendancePct} duration={1.2} suffix="%" />
        </div>
        <p className="mt-4 max-w-xs text-white/70">
          {d.stats.attendancePct >= 93
            ? "Bland de flitigaste i kammaren."
            : "Med utrymme att dyka upp oftare."}
        </p>
        <Estimate estimated={d.estimatedFields.includes("attendancePct")} />
      </SlideShell>
    ),
  },
  {
    id: "rebel",
    render: (d) => (
      <SlideShell>
        <p className="text-white/70">Gånger man röstat mot partilinjen</p>
        <div className="mt-2 font-serif text-7xl font-semibold text-white">
          <Counter value={d.stats.rebelCount} duration={1.2} />
        </div>
        <p className="mt-4 max-w-xs text-white/70">
          {d.stats.rebelCount > 30
            ? "En tydlig egen röst."
            : "Mest lojal mot partipiskan."}
        </p>
        <Estimate estimated={d.estimatedFields.includes("rebelCount")} />
      </SlideShell>
    ),
  },
  {
    id: "promises",
    render: (d) => (
      <SlideShell>
        <p className="text-white/70">Vallöften sedan 2022</p>
        <div className="mt-6 flex w-full max-w-xs items-end justify-center gap-8">
          <div className="flex flex-col items-center">
            <span className="font-serif text-6xl font-semibold text-emerald-300">
              <Counter value={d.stats.promisesKept} />
            </span>
            <span className="mt-1 text-sm text-white/70">höll</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif text-6xl font-semibold text-rose-300">
              <Counter value={d.stats.promisesBroke} />
            </span>
            <span className="mt-1 text-sm text-white/70">bröt</span>
          </div>
        </div>
        <p className="mt-6 max-w-xs text-sm text-white/70">
          Starkast inom <strong className="text-white">{d.stats.topCategory}</strong>,
          svagast inom <strong className="text-white">{d.stats.worstCategory}</strong>.
        </p>
      </SlideShell>
    ),
  },
  {
    id: "grade",
    render: (d) => (
      <SlideShell>
        <p className="text-white/70">Sammanfattande betyg</p>
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
          className="mt-4 flex size-40 items-center justify-center rounded-3xl border-4 border-white font-serif text-8xl font-semibold text-white"
        >
          {d.grade}
        </motion.div>
        <p className="mt-5 text-xl font-medium text-white">{gradeWord(d.grade)}</p>
      </SlideShell>
    ),
  },
];

function SlideShell({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full w-full flex-col items-center justify-center px-8 text-center"
    >
      {children}
    </motion.div>
  );
}

function Estimate({ estimated }: { estimated: boolean }) {
  if (!estimated) return null;
  return (
    <p className="mt-6 text-[10px] text-white/50">≈ uppskattat värde</p>
  );
}

export function WrappedStory({ data }: { data: WrappedData }) {
  const reduce = useReducedMotion();
  const total = SLIDES.length + 1; // + outro
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = getPartyColor(data.party);

  const isOutro = index >= SLIDES.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => Math.max(0, Math.min(total - 1, i + dir)));
    },
    [total],
  );

  // Auto-advance (disabled on outro, when paused, or reduced motion).
  useEffect(() => {
    if (reduce || paused || isOutro) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(total - 1, i + 1));
    }, SLIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, isOutro, reduce, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://politikerkollen.org/wrapped/${data.slug}`;
  const card = buildWrappedCard(data);

  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-2xl ring-1 ring-foreground/10 shadow-2xl select-none"
      style={{
        background: `radial-gradient(circle at 70% 10%, ${accent}cc, ${accent}55 35%, #0b0b0f 80%)`,
      }}
      role="group"
      aria-roledescription="story"
      aria-label={`Riksdagen Wrapped för ${data.subjectName}`}
    >
      {/* Progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              key={`${i}-${index}-${paused}`}
              className={cn(
                "h-full origin-left bg-white",
                i < index && "scale-x-100",
                i === index && !isOutro && !reduce && !paused && "pk-story-progress",
              )}
              style={{
                transform: i < index ? "scaleX(1)" : i === index ? undefined : "scaleX(0)",
                animationDuration: `${SLIDE_MS}ms`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          </div>
        ))}
      </div>

      {/* Top controls */}
      <div className="absolute right-3 top-6 z-20 flex items-center gap-1">
        {!isOutro && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex size-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/40"
            aria-label={paused ? "Spela" : "Pausa"}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
        )}
        <Link
          href="/wrapped"
          className="flex size-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/40"
          aria-label="Stäng"
        >
          <X className="size-4" />
        </Link>
      </div>

      {/* Tap zones */}
      <button
        type="button"
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default"
        aria-label="Föregående"
        onClick={() => go(-1)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default"
        aria-label="Nästa"
        onClick={() => go(1)}
      />

      {/* Slide content */}
      <AnimatePresence mode="wait">
        {isOutro ? (
          <motion.div
            key="outro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-5 px-8 text-center"
          >
            <h2 className="font-serif text-4xl font-semibold text-white">
              Det här är {data.subjectName}s återblick.
            </h2>
            <p className="max-w-xs text-white/80">
              Dela den — eller granska underlaget bakom varje siffra.
            </p>
            <div className="flex flex-col items-center gap-2">
              <ShareCardButton
                card={card}
                text={`${data.subjectName}s Riksdagen Wrapped: betyg ${data.grade}. Se din:`}
                url={shareUrl}
                label="Dela återblicken"
                filename={`wrapped-${data.slug.toLowerCase()}`}
              />
              <Button
                variant="ghost"
                size="lg"
                className="h-9 text-white hover:bg-white/10 hover:text-white"
                nativeButton={false}
                render={<Link href={`/parti/${data.party.toLowerCase()}`} />}
              >
                Se hela analysen
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={SLIDES[index].id} className="relative z-[5] h-full w-full">
            {SLIDES[index].render(data)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source attribution — always visible */}
      <p className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 text-center text-[10px] text-white/60">
        Källa: {data.source}
      </p>
    </div>
  );
}
