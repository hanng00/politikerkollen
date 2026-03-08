import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://politikerkollen.org";
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

interface PoliticianSitemapEntry {
  id: string;
}

async function fetchPoliticianIds(): Promise<PoliticianSitemapEntry[]> {
  if (!API_ENDPOINT) return [];

  try {
    const res = await fetch(`${API_ENDPOINT}/politicians?limit=500`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];

    const json = await res.json();
    const data: Array<{ id: string }> = json.data ?? [];
    return data.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/politiker`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/manifesto`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const politicians = await fetchPoliticianIds();
  const politicianPages: MetadataRoute.Sitemap = politicians.map((p) => ({
    url: `${BASE_URL}/politiker/${p.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...politicianPages];
}
