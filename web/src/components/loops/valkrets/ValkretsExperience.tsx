"use client";

import { ArrowLeft, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GradeMedallion, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { ShareCardButton } from "@/components/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPartyColor, needsDarkText } from "@/lib/parties";
import { gradeWord } from "@/lib/grades";
import type { Constituency } from "@/types";

import { buildValkretsCard } from "./buildCard";
import { CONSTITUENCIES, resolveConstituency } from "./constituencies";
import { useLocalScorecard } from "./useLocalScorecard";

function Lookup({ onResolved }: { onResolved: (c: Constituency) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  return (
    <Reveal className="mx-auto max-w-md text-center" from="up">
      <div className="mb-3 flex justify-center">
        <div className="flex size-12 items-center justify-center rounded-xl border bg-card">
          <MapPin className="size-5 text-primary" />
        </div>
      </div>
      <h1 className="page-title">Min valkrets</h1>
      <p className="page-subtitle mb-6">
        Skriv ditt postnummer så visar vi hur partierna i din valkrets hållit sina
        vallöften — med betyg från A till F.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = resolveConstituency(value);
          if (c) {
            setError(false);
            onResolved(c);
          } else {
            setError(true);
          }
        }}
        className="flex gap-2"
      >
        <Input
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="t.ex. 114 35"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Postnummer"
          aria-invalid={error}
          className="h-11 text-base"
        />
        <Button type="submit" size="lg" className="h-11 px-4">
          <Search className="size-4" /> Visa
        </Button>
      </form>
      {error && (
        <p className="mt-2 text-left text-xs text-destructive">
          Kunde inte hitta valkretsen. Prova ett annat postnummer eller välj nedan.
        </p>
      )}

      <div className="mt-6">
        <p className="mb-2 text-left text-xs font-medium text-muted-foreground">
          Eller välj valkrets direkt
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CONSTITUENCIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onResolved(c)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function Scorecard({
  constituency,
  onReset,
}: {
  constituency: Constituency;
  onReset: () => void;
}) {
  const { grades, isFallback } = useLocalScorecard();
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://politikerkollen.org/valkrets";

  return (
    <div>
      <button
        type="button"
        onClick={onReset}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Byt valkrets
      </button>

      <Reveal from="up" className="mb-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Din valkrets</p>
        <h1 className="mt-1">{constituency.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{constituency.seats} mandat i riksdagen</p>
      </Reveal>

      <Stagger className="space-y-2">
        {grades.map((g) => {
          const color = getPartyColor(g.party);
          return (
            <StaggerItem key={g.party}>
              <div className="flex items-center gap-4 rounded-xl border bg-card p-3 ring-1 ring-foreground/5">
                <GradeMedallion grade={g.grade} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: color, color: needsDarkText(g.party) ? "#000" : "#fff" }}
                    >
                      {g.party.toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium">{g.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {gradeWord(g.grade)} · {Math.round(g.fulfillmentRate * 100)}% av löftena
                  </p>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      {isFallback && (
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Demovärden — väntar på liveuppkoppling.
        </p>
      )}

      <div className="mt-6 flex justify-center">
        <ShareCardButton
          card={buildValkretsCard(constituency, grades)}
          text={`Så har partierna i ${constituency.name} hållit sina löften. Kolla din valkrets:`}
          url={shareUrl}
          label="Dela betygskortet"
          filename={`valkrets-${constituency.slug}`}
        />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Betygen visas på partinivå.{" "}
        <Link href="/loften" className="text-primary underline-offset-4 hover:underline">
          Se alla löften
        </Link>
      </p>
    </div>
  );
}

export function ValkretsExperience() {
  const [constituency, setConstituency] = useState<Constituency | null>(null);

  return (
    <div className="page-container-narrow page-section">
      {constituency ? (
        <Scorecard constituency={constituency} onReset={() => setConstituency(null)} />
      ) : (
        <Lookup onResolved={setConstituency} />
      )}
    </div>
  );
}
