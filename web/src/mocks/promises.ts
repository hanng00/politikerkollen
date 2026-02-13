import type { Promise } from "@/types";
import { topics } from "./topics";

export const promises: Promise[] = [
  {
    id: "pr1",
    politicianId: "anna-andersson",
    date: "2022-08-15",
    statement: "Vi ska bygga 100 000 nya hyresrätter under mandatperioden",
    source: "Valmanifest 2022",
    topic: topics[7], // Arbetsmarknad (closest fit for housing)
    status: "in_progress",
    statusUpdatedAt: "2025-06-01",
    evidence: [
      {
        date: "2024-03-15",
        description: "30 000 nya hyresrätter påbörjade enligt SCB",
      },
      {
        date: "2025-01-10",
        description: "52 000 hyresrätter färdigställda eller under byggnation",
      },
    ],
  },
  {
    id: "pr2",
    politicianId: "anna-andersson",
    date: "2022-08-15",
    statement: "Vi ska anställa 10 000 fler poliser",
    source: "Valmanifest 2022",
    topic: topics[6], // Försvar (closest fit for security)
    status: "kept",
    statusUpdatedAt: "2025-09-01",
    evidence: [
      {
        date: "2025-09-01",
        description: "Polismyndigheten rapporterar 10 500 nyanställda poliser sedan 2022",
      },
    ],
  },
  {
    id: "pr3",
    politicianId: "anna-andersson",
    date: "2022-08-15",
    statement: "Vi ska inte höja några skatter för vanligt folk",
    source: "SVT Partiledarutfrågning",
    topic: topics[1], // Skatter
    status: "broken",
    statusUpdatedAt: "2025-10-30",
    evidence: [
      {
        date: "2025-10-30",
        description: "Röstade JA till höjd arbetsgivaravgift som påverkar löneutrymmet",
      },
    ],
  },
  {
    id: "pr4",
    politicianId: "anna-andersson",
    date: "2022-09-01",
    statement: "Kärnkraften ska fasas ut helt till 2040",
    source: "Partikongress",
    topic: topics[5], // Energi
    status: "stalled",
    statusUpdatedAt: "2025-11-05",
    evidence: [
      {
        date: "2025-11-05",
        description: "Röstade mot nya reaktorer men ingen utfasningsplan presenterad",
      },
    ],
  },
  {
    id: "pr5",
    politicianId: "erik-eriksson",
    date: "2022-08-20",
    statement: "Vi ska aldrig privatisera akutsjukvården",
    source: "Lokaltidningsintervju",
    topic: topics[2], // Vård
    status: "broken",
    statusUpdatedAt: "2025-08-20",
    evidence: [
      {
        date: "2025-08-20",
        description: "Röstade JA till att tillåta privata aktörer i akutsjukvård",
      },
    ],
  },
];

export const getPromisesByPolitician = (politicianId: string): Promise[] =>
  promises.filter((p) => p.politicianId === politicianId);

export const getPromisesByStatus = (politicianId: string, status: Promise["status"]): Promise[] =>
  promises.filter((p) => p.politicianId === politicianId && p.status === status);

export const getPromiseStats = (politicianId: string) => {
  const politicianPromises = getPromisesByPolitician(politicianId);
  return {
    total: politicianPromises.length,
    kept: politicianPromises.filter((p) => p.status === "kept").length,
    broken: politicianPromises.filter((p) => p.status === "broken").length,
    inProgress: politicianPromises.filter((p) => p.status === "in_progress").length,
    stalled: politicianPromises.filter((p) => p.status === "stalled").length,
    notStarted: politicianPromises.filter((p) => p.status === "not_started").length,
  };
};
