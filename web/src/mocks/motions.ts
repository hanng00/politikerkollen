import type { Motion } from "@/types";
import { topics } from "./topics";

export const motions: Motion[] = [
  {
    id: "m1",
    politicianId: "anna-andersson",
    date: "2025-11-20",
    title: "Motion om grön omställning för industrin",
    summary: "Förslag om statligt stöd för industrins klimatomställning genom investeringar i ny teknik och kompetensutbildning.",
    topic: topics[0], // Klimat
    documentId: "mot. 2025/26:1234",
    status: "in_committee",
    committee: "Näringsutskottet",
    coAuthors: [
      { id: "erik-eriksson", name: "Erik Eriksson", partyShortName: "S" },
      { id: "p3", name: "Sara Holm", partyShortName: "S" },
    ],
  },
  {
    id: "m2",
    politicianId: "anna-andersson",
    date: "2025-09-15",
    title: "Motion om förbättrad äldrevård",
    summary: "Förslag om ökad bemanning inom äldreomsorgen och satsningar på geriatrisk kompetens.",
    topic: topics[2], // Vård
    documentId: "mot. 2025/26:987",
    status: "approved",
    committee: "Socialutskottet",
    coAuthors: [
      { id: "p4", name: "Anders Persson", partyShortName: "S" },
    ],
  },
  {
    id: "m3",
    politicianId: "anna-andersson",
    date: "2025-06-10",
    title: "Motion om lärarlyft",
    summary: "Förslag om höjda lärarlöner och förbättrade arbetsvillkor för att locka fler till läraryrket.",
    topic: topics[3], // Skola
    documentId: "mot. 2025/26:654",
    status: "rejected",
    committee: "Utbildningsutskottet",
    coAuthors: [],
  },
  {
    id: "m4",
    politicianId: "erik-eriksson",
    date: "2025-10-01",
    title: "Motion om utbyggd kollektivtrafik",
    summary: "Förslag om statliga investeringar i regional kollektivtrafik för att minska bilberoendet.",
    topic: topics[0], // Klimat
    documentId: "mot. 2025/26:1456",
    status: "in_committee",
    committee: "Trafikutskottet",
    coAuthors: [
      { id: "anna-andersson", name: "Anna Andersson", partyShortName: "S" },
    ],
  },
];

export const getMotionsByPolitician = (politicianId: string): Motion[] =>
  motions.filter((m) => m.politicianId === politicianId);

export const getMotionsByStatus = (status: Motion["status"]): Motion[] =>
  motions.filter((m) => m.status === status);
