import type { Speech } from "@/types";
import { topics } from "./topics";

export const speeches: Speech[] = [
  {
    id: "s1",
    politicianId: "anna-andersson",
    date: "2025-12-10",
    title: "Anförande om klimatomställning",
    excerpt: "Vi måste agera nu för kommande generationers skull. Klimatet kan inte vänta.",
    fullText: "Vi måste agera nu för kommande generationers skull. Klimatet kan inte vänta. Varje år vi dröjer kostar oss miljarder och äventyrar våra barns framtid. Sverige ska vara en ledare i den gröna omställningen. Vi har tekniken, vi har kunskapen, och vi har viljan. Nu behöver vi bara modet att agera.",
    topic: topics[0], // Klimat
    debate: "Klimatpolitisk debatt",
    durationSeconds: 272,
    isHighlighted: true,
  },
  {
    id: "s2",
    politicianId: "anna-andersson",
    date: "2025-11-28",
    title: "Om sjukvårdens framtid",
    excerpt: "Sjukvården måste vara tillgänglig för alla, oavsett plånbok eller postnummer.",
    topic: topics[2], // Vård
    debate: "Budgetdebatt",
    durationSeconds: 185,
    isHighlighted: false,
  },
  {
    id: "s3",
    politicianId: "anna-andersson",
    date: "2025-10-05",
    title: "Skolan och framtidens jobb",
    excerpt: "Varje barn förtjänar en bra start i livet. Det börjar i klassrummet.",
    topic: topics[3], // Skola
    debate: "Utbildningsdebatt",
    durationSeconds: 324,
    isHighlighted: false,
  },
  {
    id: "s4",
    politicianId: "anna-andersson",
    date: "2025-03-15",
    title: "Om skattepolitiken",
    excerpt: "Vi kommer aldrig att acceptera höjda skatter för arbetande svenskar.",
    fullText: "Vi kommer aldrig att acceptera höjda skatter för arbetande svenskar. Det är en princip vi står fast vid. Arbetande människor ska få behålla mer av sin lön, inte mindre. Vi prioriterar välfärden, men inte på bekostnad av dem som redan kämpar.",
    topic: topics[1], // Skatter
    debate: "Skattedebatt",
    durationSeconds: 245,
    isHighlighted: true,
  },
];

export const getSpeechesByPolitician = (politicianId: string): Speech[] =>
  speeches.filter((s) => s.politicianId === politicianId);

export const getHighlightedSpeeches = (politicianId: string): Speech[] =>
  speeches.filter((s) => s.politicianId === politicianId && s.isHighlighted);
