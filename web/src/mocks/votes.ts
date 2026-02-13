import type { Vote } from "@/types";
import { topics } from "./topics";

export const votes: Vote[] = [
  {
    id: "v1",
    politicianId: "anna-andersson",
    date: "2025-12-15",
    title: "Höjd koldioxidskatt",
    description: "Proposition om höjd koldioxidskatt på fossila bränslen med 15%.",
    topic: topics[0], // Klimat
    position: "yes",
    partyLine: "yes",
    followedParty: true,
    documentId: "prop. 2025/26:45",
    voteResult: { yes: 178, no: 171, abstain: 0, absent: 0, passed: true },
  },
  {
    id: "v2",
    politicianId: "anna-andersson",
    date: "2025-11-05",
    title: "Nya kärnkraftsreaktorer",
    description: "Proposition om att tillåta byggande av nya kärnkraftsreaktorer.",
    topic: topics[5], // Energi
    position: "no",
    partyLine: "no",
    followedParty: true,
    documentId: "prop. 2025/26:32",
    voteResult: { yes: 165, no: 184, abstain: 0, absent: 0, passed: false },
  },
  {
    id: "v3",
    politicianId: "anna-andersson",
    date: "2025-10-30",
    title: "Höjd arbetsgivaravgift",
    description: "Proposition om att höja arbetsgivaravgiften med 0.5 procentenheter.",
    topic: topics[1], // Skatter
    position: "yes",
    partyLine: "yes",
    followedParty: true,
    documentId: "prop. 2025/26:28",
    voteResult: { yes: 182, no: 167, abstain: 0, absent: 0, passed: true },
  },
  {
    id: "v4",
    politicianId: "anna-andersson",
    date: "2025-10-15",
    title: "Utökad föräldraledighet",
    description: "Proposition om att utöka föräldraledigheten till 540 dagar.",
    topic: topics[7], // Arbetsmarknad
    position: "yes",
    partyLine: "yes",
    followedParty: true,
    documentId: "prop. 2025/26:24",
    voteResult: { yes: 201, no: 148, abstain: 0, absent: 0, passed: true },
  },
  {
    id: "v5",
    politicianId: "anna-andersson",
    date: "2025-09-18",
    title: "Skärpta asylregler",
    description: "Proposition om skärpta krav för permanent uppehållstillstånd.",
    topic: topics[4], // Migration
    position: "yes",
    partyLine: "yes",
    followedParty: true,
    documentId: "prop. 2025/26:15",
    voteResult: { yes: 198, no: 151, abstain: 0, absent: 0, passed: true },
  },
];

export const getVotesByPolitician = (politicianId: string): Vote[] =>
  votes.filter((v) => v.politicianId === politicianId);

export const getRebelVotes = (politicianId: string): Vote[] =>
  votes.filter((v) => v.politicianId === politicianId && !v.followedParty);
