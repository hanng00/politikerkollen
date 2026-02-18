import type { Metadata } from "next";
import PoliticianPageClient from "./PoliticianPageClient";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

interface PoliticianBasic {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  birthYear: number | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
  };
}

async function fetchPoliticianForMetadata(
  id: string,
): Promise<PoliticianBasic | null> {
  try {
    const res = await fetch(`${API_ENDPOINT}/politicians/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

// Party full names for better descriptions
const partyFullNames: Record<string, string> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const politician = await fetchPoliticianForMetadata(id);

  if (!politician) {
    return {
      title: "Politiker hittades inte",
      description: "Den begärda politikern kunde inte hittas.",
    };
  }

  const partyName = partyFullNames[politician.party] || politician.party;
  const title = `${politician.name} (${politician.party})`;

  // Build a descriptive summary
  const descriptionParts: string[] = [];
  descriptionParts.push(`${politician.name} är ${politician.status.toLowerCase()} för ${partyName}`);

  if (politician.constituency) {
    descriptionParts.push(`från ${politician.constituency}`);
  }

  // Add activity stats if available
  const stats: string[] = [];
  if (politician.stats.totalVotes > 0) {
    stats.push(`${politician.stats.totalVotes.toLocaleString("sv-SE")} röster`);
  }
  if (politician.stats.totalSpeeches > 0) {
    stats.push(
      `${politician.stats.totalSpeeches.toLocaleString("sv-SE")} anföranden`,
    );
  }
  if (politician.stats.totalAuthored > 0) {
    stats.push(
      `${politician.stats.totalAuthored.toLocaleString("sv-SE")} dokument`,
    );
  }

  let description = descriptionParts.join(" ");
  if (stats.length > 0) {
    description += `. Aktivitet i riksdagen: ${stats.join(", ")}.`;
  }

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title: `${politician.name} (${politician.party})`,
      description,
      type: "profile",
      siteName: "Politikerkollen",
    },
    twitter: {
      card: "summary",
      title: `${politician.name} (${politician.party})`,
      description,
    },
  };

  // Add image if available
  if (politician.imageUrl) {
    metadata.openGraph!.images = [
      {
        url: politician.imageUrl,
        alt: `Foto av ${politician.name}`,
      },
    ];
    metadata.twitter!.images = [politician.imageUrl];
  }

  return metadata;
}

export default async function PoliticianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PoliticianPageClient id={id} />;
}
