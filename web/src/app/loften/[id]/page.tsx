import type { Metadata } from "next";
import PromiseDetailClient from "./PromiseDetailClient";

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

interface PromiseForMeta {
  promise_party: string;
  promise_year: number;
  promise_text: string;
  has_contradiction: boolean;
  motions: Array<{
    promise_party_vote: "Ja" | "Nej" | "Avstår" | null;
    source_titel: string;
  }>;
}

async function fetchPromiseForMetadata(
  id: string
): Promise<PromiseForMeta | null> {
  if (!API_ENDPOINT) return null;

  try {
    const res = await fetch(`${API_ENDPOINT}/contradictions/${id}`, {
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
  const promise = await fetchPromiseForMetadata(id);

  if (!promise) {
    return { title: "Löfte" };
  }

  const partyName =
    PARTY_NAMES[promise.promise_party] ??
    promise.promise_party.toUpperCase();

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

  const descParts = [`Sa: "${promise.promise_text}"`];
  if (voteLabel) {
    descParts.push(`Gjorde: ${partyName} ${voteLabel}.`);
  }
  if (bestMotion) {
    descParts.push(`Bevis: ${bestMotion.source_titel}`);
  }

  const description = descParts.join(" ");

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

export default async function PromiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PromiseDetailClient id={id} />;
}
