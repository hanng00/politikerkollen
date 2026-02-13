import type { Contradiction } from "@/types";
import { topics } from "./topics";

export const contradictions: Contradiction[] = [
  {
    id: "c1",
    politicianId: "anna-andersson",
    topic: topics[1], // Skatter
    said: {
      date: "2025-03-15",
      content: "Vi kommer aldrig att acceptera höjda skatter för arbetande svenskar.",
      source: "Riksdagsdebatt",
      type: "speech",
    },
    done: {
      date: "2025-10-30",
      content: "Röstade JA till höjd arbetsgivaravgift (+0.5%)",
      source: "Votering prop. 2025/26:28",
      type: "vote",
    },
    daysApart: 229,
    severity: "high",
    viewCount: 4521,
    shareCount: 156,
    isTrending: true,
    createdAt: "2025-10-30T12:00:00Z",
  },
  {
    id: "c2",
    politicianId: "anna-andersson",
    topic: topics[5], // Energi
    said: {
      date: "2024-09-01",
      content: "Kärnkraft är en viktig del av energimixen för att nå klimatmålen.",
      source: "Debattartikel DN",
      type: "article",
    },
    done: {
      date: "2025-11-05",
      content: "Röstade NEJ till nya kärnkraftsreaktorer",
      source: "Votering prop. 2025/26:32",
      type: "vote",
    },
    daysApart: 430,
    severity: "high",
    viewCount: 2341,
    shareCount: 89,
    isTrending: false,
    createdAt: "2025-11-05T12:00:00Z",
  },
  {
    id: "c3",
    politicianId: "anna-andersson",
    topic: topics[4], // Migration
    said: {
      date: "2024-06-12",
      content: "Vi behöver en human och rättssäker asylprocess.",
      source: "Partikonferens",
      type: "speech",
    },
    done: {
      date: "2025-09-18",
      content: "Röstade JA till skärpta asylregler",
      source: "Votering prop. 2025/26:15",
      type: "vote",
    },
    daysApart: 463,
    severity: "medium",
    viewCount: 1892,
    shareCount: 67,
    isTrending: false,
    createdAt: "2025-09-18T12:00:00Z",
  },
  {
    id: "c4",
    politicianId: "johan-lindberg",
    topic: topics[0], // Klimat
    said: {
      date: "2024-03-20",
      content: "Klimathotet är överdrivet och vi ska inte offra svensk industri.",
      source: "SVT Agenda",
      type: "interview",
    },
    done: {
      date: "2025-12-01",
      content: "Röstade JA till ökade klimatinvesteringar för industrin",
      source: "Votering prop. 2025/26:52",
      type: "vote",
    },
    daysApart: 621,
    severity: "high",
    viewCount: 8923,
    shareCount: 423,
    isTrending: true,
    createdAt: "2025-12-01T12:00:00Z",
  },
  {
    id: "c5",
    politicianId: "erik-eriksson",
    topic: topics[2], // Vård
    said: {
      date: "2025-01-15",
      content: "Vi ska aldrig privatisera akutsjukvården.",
      source: "Lokaltidning",
      type: "article",
    },
    done: {
      date: "2025-08-20",
      content: "Röstade JA till att tillåta privata aktörer i akutsjukvård",
      source: "Votering prop. 2025/26:18",
      type: "vote",
    },
    daysApart: 217,
    severity: "medium",
    viewCount: 1234,
    shareCount: 45,
    isTrending: false,
    createdAt: "2025-08-20T12:00:00Z",
  },
];

export const getContradictionsByPolitician = (politicianId: string): Contradiction[] =>
  contradictions.filter((c) => c.politicianId === politicianId);

export const getTrendingContradictions = (): Contradiction[] =>
  contradictions.filter((c) => c.isTrending).sort((a, b) => b.viewCount - a.viewCount);

export const getAllContradictions = (options?: {
  topicId?: string;
  sortBy?: "recent" | "trending" | "views";
}): Contradiction[] => {
  let result = [...contradictions];

  // Filter by topic
  if (options?.topicId) {
    result = result.filter((c) => c.topic.id === options.topicId);
  }

  // Sort
  switch (options?.sortBy) {
    case "trending":
      result.sort((a, b) => {
        if (a.isTrending && !b.isTrending) return -1;
        if (!a.isTrending && b.isTrending) return 1;
        return b.viewCount - a.viewCount;
      });
      break;
    case "views":
      result.sort((a, b) => b.viewCount - a.viewCount);
      break;
    case "recent":
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  return result;
};
