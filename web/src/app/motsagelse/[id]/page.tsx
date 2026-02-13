import { SiteHeader } from "@/components/layout";
import { ContradictionDetail } from "./ContradictionDetail";
import { contradictions } from "@/mocks/contradictions";
import { getPoliticianById } from "@/mocks/politicians";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const contradiction = contradictions.find((c) => c.id === id);
  const politician = contradiction
    ? getPoliticianById(contradiction.politicianId)
    : undefined;

  if (!contradiction || !politician) {
    return { title: "Motsägelse hittades inte" };
  }

  const fullName = `${politician.firstName} ${politician.lastName}`;
  const title = `${fullName} (${politician.party.shortName}): "${contradiction.said.content.slice(0, 60)}..."`;
  const description = `Sa: "${contradiction.said.content}" → Gjorde: ${contradiction.done.content}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Politikerkollen",
      // TODO: Dynamic OG image generation
      // images: [`/api/og/motsagelse/${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MotsagelsePage({ params }: PageProps) {
  const { id } = await params;
  const contradiction = contradictions.find((c) => c.id === id);
  const politician = contradiction
    ? getPoliticianById(contradiction.politicianId)
    : undefined;

  if (!contradiction || !politician) {
    notFound();
  }

  // Get related contradictions (same topic or same politician)
  const related = contradictions
    .filter(
      (c) =>
        c.id !== id &&
        (c.topic.id === contradiction.topic.id ||
          c.politicianId === contradiction.politicianId)
    )
    .slice(0, 3);

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <ContradictionDetail
        contradiction={contradiction}
        politician={politician}
        relatedContradictions={related}
      />
    </div>
  );
}
