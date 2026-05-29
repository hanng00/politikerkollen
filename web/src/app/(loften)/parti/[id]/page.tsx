import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PartyScorecardClient from "./PartyScorecardClient";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

const PARTY_NAMES: Record<string, string> = {
  s: "Socialdemokraterna",
  m: "Moderaterna",
  sd: "Sverigedemokraterna",
  c: "Centerpartiet",
  v: "Vänsterpartiet",
  kd: "Kristdemokraterna",
  l: "Liberalerna",
  mp: "Miljöpartiet",
};

const VALID_PARTIES = new Set(Object.keys(PARTY_NAMES));

interface PartyScorecardMeta {
  party: string;
  party_name: string;
  total_promises: number;
  fulfillment_rate: number;
  implemented_count: number;
  partial_count: number;
}

async function fetchPartyScorecard(partyId: string): Promise<PartyScorecardMeta | null> {
  if (!API_ENDPOINT) return null;

  try {
    const res = await fetch(`${API_ENDPOINT}/parties/scorecard/${partyId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const partyId = id.toLowerCase();
  
  if (!VALID_PARTIES.has(partyId)) {
    return { title: "Parti" };
  }

  const scorecard = await fetchPartyScorecard(partyId);

  if (!scorecard) {
    return { title: PARTY_NAMES[partyId] ?? "Parti" };
  }

  const title = `${scorecard.party_name}: ${scorecard.fulfillment_rate}% genomfört — Politikerkollen`;
  const description = `${scorecard.party_name} har genomfört ${scorecard.fulfillment_rate}% av sina vallöften från 2022. ${scorecard.implemented_count} löften genomförda, ${scorecard.partial_count} delvis genomförda av totalt ${scorecard.total_promises} löften.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Politikerkollen",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partyId = id.toLowerCase();

  if (!VALID_PARTIES.has(partyId)) {
    notFound();
  }

  return <PartyScorecardClient partyId={partyId} />;
}
