"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { PARTY_ABBREVS, getPartyColor, getPartyName, needsDarkText } from "@/lib/parties";

import { WrappedStory } from "./WrappedStory";
import { useWrappedData } from "./useWrappedData";

/** Landing: pick a party to generate its Wrapped story. */
export function WrappedPicker() {
  return (
    <div className="page-container-narrow page-section">
      <Reveal className="mx-auto max-w-md text-center" from="up">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Riksdagen Wrapped
        </p>
        <h1 className="page-title mt-2">Din återblick på mandatperioden</h1>
        <p className="page-subtitle mb-6">
          Välj ett parti för en svepbar story om röster, närvaro och hållna löften
          — i Spotify-Wrapped-stil.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PARTY_ABBREVS.map((party) => {
            const color = getPartyColor(party);
            return (
              <Link
                key={party}
                href={`/wrapped/${party}`}
                className="group flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:ring-2"
                style={{ ["--tw-ring-color" as string]: color }}
              >
                <span
                  className="flex size-8 items-center justify-center rounded-full text-sm font-bold"
                  style={{ backgroundColor: color, color: needsDarkText(party) ? "#000" : "#fff" }}
                >
                  {party.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground">{getPartyName(party)}</span>
              </Link>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}

/** Connected story for a single party. */
export function WrappedExperience({ party }: { party: string }) {
  const { data, isLoading } = useWrappedData(party);

  return (
    <div className="page-container-narrow page-section">
      {isLoading ? (
        <div className="flex aspect-[9/16] max-w-[420px] mx-auto items-center justify-center rounded-2xl border bg-card">
          <Spinner />
        </div>
      ) : (
        <Reveal from="up">
          <WrappedStory data={data} />
        </Reveal>
      )}
    </div>
  );
}
