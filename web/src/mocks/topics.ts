import type { Topic } from "@/types";

export const topics: Topic[] = [
  { id: "climate", name: "Klimat", slug: "klimat", description: "Klimat och miljöfrågor" },
  { id: "taxes", name: "Skatter", slug: "skatter", description: "Skatte- och finanspolitik" },
  { id: "healthcare", name: "Vård", slug: "vard", description: "Sjukvård och omsorg" },
  { id: "education", name: "Skola", slug: "skola", description: "Utbildning och skolfrågor" },
  { id: "migration", name: "Migration", slug: "migration", description: "Invandring och integration" },
  { id: "energy", name: "Energi", slug: "energi", description: "Energipolitik" },
  { id: "defense", name: "Försvar", slug: "forsvar", description: "Försvar och säkerhet" },
  { id: "labor", name: "Arbetsmarknad", slug: "arbetsmarknad", description: "Arbetsmarknad och jobb" },
];

export const getTopicById = (id: string): Topic | undefined =>
  topics.find((t) => t.id === id);

export const getTopicBySlug = (slug: string): Topic | undefined =>
  topics.find((t) => t.slug === slug);
