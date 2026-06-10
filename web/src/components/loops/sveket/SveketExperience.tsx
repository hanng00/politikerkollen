"use client";

import { ArrowLeft, ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ShareCardButton } from "@/components/share";
import { Button } from "@/components/ui/button";
import { fixturePromisesForParty } from "@/components/loops/_fixtures/promises";
import { usePromiseScores } from "@/hooks/useAccountability";
import { PARTY_ABBREVS, getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";
import { cn } from "@/lib/utils";
import { statusWord } from "@/lib/promise-verdict";

import {
  buildSveketCard,
  receiptTotals,
  toReceiptItems,
  type ReceiptItem,
} from "./buildCard";

const GLYPH: Record<ReceiptItem["status"], string> = {
  kept: "✓",
  broke: "✕",
  mixed: "≈",
  neutral: "–",
};

const STATUS_COLOR: Record<ReceiptItem["status"], string> = {
  kept: "text-success",
  broke: "text-destructive",
  mixed: "text-warning",
  neutral: "text-muted-foreground",
};

function PartyCompass({ onPick }: { onPick: (party: string) => void }) {
  return (
    <Reveal className="mx-auto max-w-md text-center" from="up">
      <div className="mb-3 flex justify-center">
        <div className="flex size-12 items-center justify-center rounded-xl border bg-card">
          <Receipt className="size-5 text-primary" />
        </div>
      </div>
      <h1 className="page-title">Vad lovade de — och vad gjorde de?</h1>
      <p className="page-subtitle mb-6">
        Välj ett parti så skriver vi ut ett kvitto på vilka vallöften som hållits
        och vilka som brutits sedan valet 2022.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PARTY_ABBREVS.map((party) => {
          const color = getPartyColor(party);
          return (
            <button
              key={party}
              type="button"
              onClick={() => onPick(party)}
              className="group flex h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:ring-2 focus-visible:outline-none focus-visible:ring-2"
              style={{ ["--tw-ring-color" as string]: color }}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: color,
                  color: needsDarkText(party) ? "#000" : "#fff",
                }}
              >
                {party.toUpperCase()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {getPartyName(party)}
              </span>
            </button>
          );
        })}
      </div>
    </Reveal>
  );
}

function Receipt9x16({
  party,
  items,
}: {
  party: string;
  items: ReceiptItem[];
}) {
  const totals = receiptTotals(items);
  const color = getPartyColor(party);

  return (
    <div className="mx-auto w-full max-w-[360px] rounded-lg bg-card font-mono ring-1 ring-foreground/10 shadow-2xl">
      <div className="h-1.5 w-full rounded-t-lg" style={{ backgroundColor: color }} />
      <div className="p-5">
        <div className="border-b border-dashed border-border pb-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Sveks-kvitto
          </p>
          <p className="mt-1 font-serif text-lg font-semibold">
            {getPartyName(party)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Mandatperioden 2022–
          </p>
        </div>

        <Stagger className="divide-y divide-dashed divide-border">
          {items.map((item) => (
            <StaggerItem key={item.id}>
              <Link
                href={`/loften/${item.id}`}
                className="flex items-start gap-3 py-3 transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center text-sm font-bold",
                    STATUS_COLOR[item.status],
                  )}
                  aria-hidden
                >
                  {GLYPH[item.status]}
                </span>
                <span className="flex-1 text-[11px] leading-snug text-foreground">
                  {item.text}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[9px] font-bold uppercase tracking-wider",
                    STATUS_COLOR[item.status],
                  )}
                >
                  {statusWord(item.status)}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-3 border-t border-dashed border-border pt-3 text-center text-[11px]">
          <div className="flex justify-center gap-4">
            <span className="text-success">{totals.kept} höll</span>
            <span className="text-destructive">{totals.broke} bröt</span>
            <span className="text-warning">{totals.mixed} blandat</span>
          </div>
          <p className="mt-3 text-[9px] text-muted-foreground">
            Källa: Riksdagens öppna data via Politikerkollen
          </p>
          <p className="text-[9px] text-muted-foreground">politikerkollen.org</p>
        </div>
      </div>
    </div>
  );
}

export function SveketExperience({ initialParty }: { initialParty?: string }) {
  const [party, setParty] = useState<string | null>(initialParty ?? null);

  const { data } = usePromiseScores(
    party ? { party, limit: 40 } : { limit: 1 },
  );

  const items = useMemo(() => {
    if (!party) return [];
    const promises =
      data?.data && data.data.length > 0
        ? data.data
        : fixturePromisesForParty(party); // TODO(api): fallback when API unreachable
    return toReceiptItems(promises);
  }, [party, data]);

  if (!party) {
    return (
      <div className="page-container-narrow page-section">
        <PartyCompass onPick={setParty} />
      </div>
    );
  }

  const card = buildSveketCard(party, items);
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://politikerkollen.org/sveket";

  return (
    <div className="page-container-narrow page-section">
      <button
        type="button"
        onClick={() => setParty(null)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Välj ett annat parti
      </button>

      <Reveal from="up">
        <Receipt9x16 party={party} items={items} />
      </Reveal>

      <Reveal from="up" delay={0.15} className="mt-6 flex flex-col items-center gap-3">
        <ShareCardButton
          card={card}
          text={`Kvittot på vad ${getPartyName(party)} lovade — och gjorde. Sedan valet 2022:`}
          url={shareUrl}
          label="Dela kvittot"
          filename={`sveks-kvitto-${party.toLowerCase()}`}
        />
        <Button variant="ghost" size="lg" className="h-9" nativeButton={false} render={<Link href="/loften" />}>
          Se alla löften
          <ChevronRight className="size-4" />
        </Button>
      </Reveal>
    </div>
  );
}
