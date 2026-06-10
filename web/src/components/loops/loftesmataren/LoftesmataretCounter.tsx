"use client";

import { Check, ChevronRight, Code2, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Counter, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ShareCardButton } from "@/components/share";
import { Button } from "@/components/ui/button";
import { getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";
import { cn } from "@/lib/utils";

import { buildLoftesmataretCard } from "./buildCard";
import { useBrokenPromises } from "./useBrokenPromises";

function LiveDot() {
  return (
    <span className="relative flex size-2.5">
      <span className="pk-live-dot absolute inline-flex size-2.5 rounded-full bg-destructive" />
      <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
    </span>
  );
}

function EmbedSection({ origin }: { origin: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe src="${origin}/loftesmataren/embed" title="Löftesmätaren – Politikerkollen" width="100%" height="160" style="border:0;border-radius:12px" loading="lazy"></iframe>`;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Code2 className="size-4 text-muted-foreground" />
        Bädda in mätaren
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Klistra in koden på din sajt eller blogg. Mätaren uppdateras automatiskt.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
        <code>{snippet}</code>
      </pre>
      <Button
        variant="outline"
        size="lg"
        className="mt-3 h-9"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Kopierad" : "Kopiera inbäddningskod"}
      </Button>
    </div>
  );
}

export function LoftesmataretCounter({ live = true }: { live?: boolean }) {
  const { brokeTotal, mixedTotal, feed, isFallback } = useBrokenPromises();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://politikerkollen.org";
  const shareUrl = `${origin}/loftesmataren`;
  const card = buildLoftesmataretCard(brokeTotal, mixedTotal);

  return (
    <div className="page-container-narrow page-section space-y-8">
      <Reveal className="text-center" from="up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          {live && <LiveDot />}
          {live ? "Uppdateras löpande" : "Sedan valet 2022"}
        </div>
        <h1 className="page-title">Löftesmätaren</h1>
        <p className="page-subtitle">
          Antal vallöften som brutits sedan valet 2022 — varje rad nedan länkar
          till underlaget i riksdagen.
        </p>
      </Reveal>

      <Reveal from="up" delay={0.1}>
        <div className="relative overflow-hidden rounded-2xl border bg-card p-8 text-center ring-1 ring-foreground/5 pattern-grid-subtle">
          <div className="relative">
            <div className="font-serif text-7xl font-semibold text-destructive sm:text-8xl">
              {live ? (
                <Counter value={brokeTotal} duration={1.4} />
              ) : (
                <span className="tabular-nums">{brokeTotal}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              brutna löften
              {mixedTotal > 0 && (
                <>
                  {" "}· <span className="text-warning">{mixedTotal} motsägelsefulla</span>
                </>
              )}
            </p>
            {isFallback && (
              <p className="mt-3 text-[10px] text-muted-foreground">
                Demovärden — väntar på liveuppkoppling.
              </p>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal from="up" delay={0.15} className="flex flex-wrap justify-center gap-3">
        <ShareCardButton
          card={card}
          text={`${brokeTotal} brutna vallöften sedan valet 2022. Följ Löftesmätaren:`}
          url={shareUrl}
          label="Dela mätaren"
          filename="loftesmataren"
        />
      </Reveal>

      {/* The live feed — each "tick" links to its evidence */}
      <section aria-label="Senaste brutna löften">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Senaste avvikelserna
        </h2>
        <Stagger className="space-y-2">
          {feed.map((item) => {
            const color = getPartyColor(item.party);
            return (
              <StaggerItem key={item.id}>
                <Link
                  href={`/loften/${item.id}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      backgroundColor: color,
                      color: needsDarkText(item.party) ? "#000" : "#fff",
                    }}
                  >
                    {item.party.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm">{item.text}</span>
                    <span
                      className={cn(
                        "text-xs",
                        item.status === "broke" ? "text-destructive" : "text-warning",
                      )}
                    >
                      {getPartyName(item.party)} · {item.label}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <EmbedSection origin={origin} />
    </div>
  );
}
