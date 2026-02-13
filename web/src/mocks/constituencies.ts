import type { Constituency, CandidateScore } from "@/types";

export const constituencies: Constituency[] = [
  { id: "stockholms-lan", name: "Stockholms län", slug: "stockholms-lan", seats: 39 },
  { id: "vastra-gotalands-lan", name: "Västra Götalands län", slug: "vastra-gotalands-lan", seats: 36 },
  { id: "skane-lans-sodra", name: "Skåne läns södra", slug: "skane-lans-sodra", seats: 12 },
  { id: "ostergotlands-lan", name: "Östergötlands län", slug: "ostergotlands-lan", seats: 10 },
  { id: "uppsala-lan", name: "Uppsala län", slug: "uppsala-lan", seats: 9 },
  { id: "goteborgs-kommun", name: "Göteborgs kommun", slug: "goteborgs-kommun", seats: 11 },
  { id: "skane-lans-vastra", name: "Skåne läns västra", slug: "skane-lans-vastra", seats: 10 },
  { id: "jonkopings-lan", name: "Jönköpings län", slug: "jonkopings-lan", seats: 8 },
  { id: "sodermanlands-lan", name: "Södermanlands län", slug: "sodermanlands-lan", seats: 7 },
];

// Map postal code prefixes (first 2 digits) to constituencies
export const postalCodeToConstituency: Record<string, string> = {
  // Stockholm area
  "10": "stockholms-lan",
  "11": "stockholms-lan",
  "12": "stockholms-lan",
  "13": "stockholms-lan",
  "14": "stockholms-lan",
  "15": "sodermanlands-lan",
  "16": "stockholms-lan",
  "17": "stockholms-lan",
  "18": "stockholms-lan",
  "19": "stockholms-lan",
  // Göteborg area
  "40": "goteborgs-kommun",
  "41": "goteborgs-kommun",
  "42": "vastra-gotalands-lan",
  "43": "vastra-gotalands-lan",
  "44": "vastra-gotalands-lan",
  "45": "vastra-gotalands-lan",
  // Malmö/Skåne area
  "20": "skane-lans-sodra",
  "21": "skane-lans-sodra",
  "22": "skane-lans-vastra",
  "23": "skane-lans-vastra",
  "24": "skane-lans-vastra",
  "25": "skane-lans-vastra",
  // Uppsala
  "75": "uppsala-lan",
  "76": "uppsala-lan",
  // Östergötland
  "58": "ostergotlands-lan",
  "59": "ostergotlands-lan",
  "60": "ostergotlands-lan",
  // Jönköping
  "55": "jonkopings-lan",
  "56": "jonkopings-lan",
  // Default fallback covered by lookup function
};

// Which politicians are candidates in which constituency
export const constituencyCandidates: Record<string, string[]> = {
  "stockholms-lan": ["anna-andersson", "maria-svensson", "johan-lindberg", "lisa-berg"],
  "vastra-gotalands-lan": ["erik-eriksson", "karl-nilsson", "maria-svensson"],
  "skane-lans-sodra": ["maria-svensson", "anna-andersson", "johan-lindberg"],
  "ostergotlands-lan": ["johan-lindberg", "erik-eriksson", "lisa-berg"],
  "uppsala-lan": ["lisa-berg", "karl-nilsson", "anna-andersson"],
  "goteborgs-kommun": ["karl-nilsson", "erik-eriksson", "johan-lindberg"],
  "skane-lans-vastra": ["maria-svensson", "lisa-berg", "erik-eriksson"],
  "jonkopings-lan": ["anna-andersson", "johan-lindberg", "karl-nilsson"],
  "sodermanlands-lan": ["erik-eriksson", "anna-andersson", "lisa-berg"],
};

// Topic scores per politician (simulates voting history analysis)
// Score: -100 (strongly against) to +100 (strongly for)
export const candidateTopicScores: CandidateScore[] = [
  // Anna Andersson (S) - center-left positions
  { politicianId: "anna-andersson", topicId: "climate", score: 65, actionCount: 23 },
  { politicianId: "anna-andersson", topicId: "taxes", score: 45, actionCount: 31 },
  { politicianId: "anna-andersson", topicId: "healthcare", score: 80, actionCount: 28 },
  { politicianId: "anna-andersson", topicId: "education", score: 70, actionCount: 19 },
  { politicianId: "anna-andersson", topicId: "migration", score: 40, actionCount: 15 },
  { politicianId: "anna-andersson", topicId: "energy", score: 50, actionCount: 12 },
  { politicianId: "anna-andersson", topicId: "defense", score: 55, actionCount: 8 },
  { politicianId: "anna-andersson", topicId: "labor", score: 85, actionCount: 34 },

  // Erik Eriksson (S) - similar to Anna
  { politicianId: "erik-eriksson", topicId: "climate", score: 70, actionCount: 45 },
  { politicianId: "erik-eriksson", topicId: "taxes", score: 50, actionCount: 52 },
  { politicianId: "erik-eriksson", topicId: "healthcare", score: 75, actionCount: 41 },
  { politicianId: "erik-eriksson", topicId: "education", score: 65, actionCount: 33 },
  { politicianId: "erik-eriksson", topicId: "migration", score: 35, actionCount: 22 },
  { politicianId: "erik-eriksson", topicId: "energy", score: 55, actionCount: 18 },
  { politicianId: "erik-eriksson", topicId: "defense", score: 60, actionCount: 14 },
  { politicianId: "erik-eriksson", topicId: "labor", score: 90, actionCount: 48 },

  // Maria Svensson (M) - center-right positions
  { politicianId: "maria-svensson", topicId: "climate", score: 30, actionCount: 21 },
  { politicianId: "maria-svensson", topicId: "taxes", score: -60, actionCount: 38 },
  { politicianId: "maria-svensson", topicId: "healthcare", score: 45, actionCount: 25 },
  { politicianId: "maria-svensson", topicId: "education", score: 40, actionCount: 22 },
  { politicianId: "maria-svensson", topicId: "migration", score: -30, actionCount: 18 },
  { politicianId: "maria-svensson", topicId: "energy", score: 20, actionCount: 15 },
  { politicianId: "maria-svensson", topicId: "defense", score: 80, actionCount: 12 },
  { politicianId: "maria-svensson", topicId: "labor", score: -25, actionCount: 29 },

  // Johan Lindberg (SD) - right-wing positions
  { politicianId: "johan-lindberg", topicId: "climate", score: -40, actionCount: 12 },
  { politicianId: "johan-lindberg", topicId: "taxes", score: -50, actionCount: 18 },
  { politicianId: "johan-lindberg", topicId: "healthcare", score: 55, actionCount: 14 },
  { politicianId: "johan-lindberg", topicId: "education", score: 30, actionCount: 11 },
  { politicianId: "johan-lindberg", topicId: "migration", score: -90, actionCount: 28 },
  { politicianId: "johan-lindberg", topicId: "energy", score: -20, actionCount: 9 },
  { politicianId: "johan-lindberg", topicId: "defense", score: 85, actionCount: 16 },
  { politicianId: "johan-lindberg", topicId: "labor", score: 20, actionCount: 13 },

  // Lisa Berg (C) - center/liberal positions
  { politicianId: "lisa-berg", topicId: "climate", score: 75, actionCount: 29 },
  { politicianId: "lisa-berg", topicId: "taxes", score: -30, actionCount: 24 },
  { politicianId: "lisa-berg", topicId: "healthcare", score: 50, actionCount: 21 },
  { politicianId: "lisa-berg", topicId: "education", score: 60, actionCount: 26 },
  { politicianId: "lisa-berg", topicId: "migration", score: 50, actionCount: 17 },
  { politicianId: "lisa-berg", topicId: "energy", score: 40, actionCount: 31 },
  { politicianId: "lisa-berg", topicId: "defense", score: 45, actionCount: 12 },
  { politicianId: "lisa-berg", topicId: "labor", score: 35, actionCount: 19 },

  // Karl Nilsson (V) - left-wing positions
  { politicianId: "karl-nilsson", topicId: "climate", score: 90, actionCount: 38 },
  { politicianId: "karl-nilsson", topicId: "taxes", score: 85, actionCount: 42 },
  { politicianId: "karl-nilsson", topicId: "healthcare", score: 95, actionCount: 45 },
  { politicianId: "karl-nilsson", topicId: "education", score: 80, actionCount: 36 },
  { politicianId: "karl-nilsson", topicId: "migration", score: 70, actionCount: 25 },
  { politicianId: "karl-nilsson", topicId: "energy", score: 75, actionCount: 28 },
  { politicianId: "karl-nilsson", topicId: "defense", score: -20, actionCount: 18 },
  { politicianId: "karl-nilsson", topicId: "labor", score: 95, actionCount: 52 },
];

// Helper functions
export const getConstituencyById = (id: string): Constituency | undefined =>
  constituencies.find((c) => c.id === id);

export const getConstituencyBySlug = (slug: string): Constituency | undefined =>
  constituencies.find((c) => c.slug === slug);

export const getConstituencyByPostalCode = (postalCode: string): Constituency | undefined => {
  const prefix = postalCode.replace(/\s/g, "").slice(0, 2);
  const constituencyId = postalCodeToConstituency[prefix];
  if (constituencyId) {
    return getConstituencyById(constituencyId);
  }
  // Default to Stockholm if not found
  return getConstituencyById("stockholms-lan");
};

export const getCandidatesForConstituency = (constituencyId: string): string[] =>
  constituencyCandidates[constituencyId] ?? [];

export const getScoresForCandidate = (politicianId: string): CandidateScore[] =>
  candidateTopicScores.filter((s) => s.politicianId === politicianId);

export const getScoreForCandidateTopic = (
  politicianId: string,
  topicId: string
): CandidateScore | undefined =>
  candidateTopicScores.find(
    (s) => s.politicianId === politicianId && s.topicId === topicId
  );
