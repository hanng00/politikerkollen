import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader, SiteFooter } from "@/components/layout";
import { WrappedExperience } from "@/components/loops/wrapped";
import { PARTY_ABBREVS, getPartyName } from "@/lib/parties";

type PartyAbbrev = (typeof PARTY_ABBREVS)[number];

function isPartyAbbrev(value: string): value is PartyAbbrev {
  return (PARTY_ABBREVS as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const key = id.toLowerCase();
  if (!isPartyAbbrev(key)) return { title: "Riksdagen Wrapped" };
  return {
    title: `${getPartyName(key)} – Riksdagen Wrapped`,
    description: `En svepbar återblick på ${getPartyName(key)}s mandatperiod.`,
  };
}

export default async function WrappedPartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = id.toLowerCase();
  if (!isPartyAbbrev(key)) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <WrappedExperience party={key} />
        <SiteFooter />
      </main>
    </div>
  );
}
