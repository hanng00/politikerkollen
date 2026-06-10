"use client";

import { Counter } from "@/components/motion";

import { useBrokenPromises } from "./useBrokenPromises";

/**
 * Compact, iframe-friendly widget. Designed to sit on third-party sites and
 * link back to Politikerkollen. Always carries source attribution.
 */
export function EmbedWidget() {
  const { brokeTotal, mixedTotal } = useBrokenPromises();

  return (
    <a
      href="https://politikerkollen.org/loftesmataren"
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full w-full items-center gap-4 rounded-xl border bg-card p-4 no-underline ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
    >
      <div className="flex flex-col">
        <span className="font-serif text-4xl font-semibold leading-none text-destructive">
          <Counter value={brokeTotal} duration={1.2} />
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          brutna vallöften sedan 2022
          {mixedTotal > 0 ? ` · ${mixedTotal} motsägelsefulla` : ""}
        </span>
      </div>
      <div className="ml-auto flex flex-col items-end text-right">
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="pk-live-dot inline-flex size-1.5 rounded-full bg-destructive" />
          Löftesmätaren
        </span>
        <span className="text-[10px] text-muted-foreground">politikerkollen.org</span>
      </div>
    </a>
  );
}
