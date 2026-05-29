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
  assessment_label: string;
  evidence_direction: string;
  motion_supported_count: number;
  motion_bifall_count: number;
  motion_opposed_count: number;
  proposition_count: number;
  source_type: string;
  top_evidence: Array<{
    source_titel: string;
    signal_description: string;
  }>;
}

async function fetchPromiseForMetadata(
  id: string,
): Promise<PromiseForMeta | null> {
  if (!API_ENDPOINT) return null;

  try {
    const res = await fetch(`${API_ENDPOINT}/promises/scores/${id}`, {
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
    PARTY_NAMES[promise.promise_party] ?? promise.promise_party.toUpperCase();

  const sourceLabel = promise.source_type === "tidoavtalet"
    ? "Tidöavtalet"
    : `valmanifestet ${promise.promise_year}`;

  const supportedCount =
    Number(promise.motion_supported_count || 0) +
    Number(promise.motion_bifall_count || 0) +
    Number(promise.proposition_count || 0);
  const opposedCount = Number(promise.motion_opposed_count || 0);

  const promiseShort = promise.promise_text.length > 60
    ? promise.promise_text.slice(0, 57) + "..."
    : promise.promise_text;

  const title = `${partyName} lovade "${promiseShort}" — ${promise.assessment_label}`;

  const voteParts: string[] = [];
  if (supportedCount > 0) voteParts.push(`${supportedCount} röstningar för`);
  if (opposedCount > 0) voteParts.push(`${opposedCount} emot`);
  const voteStr = voteParts.length > 0 ? ` ${voteParts.join(", ")}.` : "";

  const description = `${partyName} lovade i ${sourceLabel}: "${promiseShort}" AI-analys av riksdagens voteringsprotokoll visar: ${promise.assessment_label}.${voteStr}`;

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
