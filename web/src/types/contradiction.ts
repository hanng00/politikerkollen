import type { Topic } from "./topic";

export type ContradictionSeverity = "low" | "medium" | "high";

export interface ContradictionStatement {
  date: string;
  content: string;
  source: string;
  sourceUrl?: string;
  type: "speech" | "article" | "interview" | "social_media" | "motion";
}

export interface ContradictionAction {
  date: string;
  content: string;
  source: string;
  sourceUrl?: string;
  type: "vote" | "motion" | "statement";
}

export interface Contradiction {
  id: string;
  politicianId: string;
  topic: Topic;
  said: ContradictionStatement;
  done: ContradictionAction;
  daysApart: number;
  severity: ContradictionSeverity;
  viewCount: number;
  shareCount: number;
  isTrending: boolean;
  createdAt: string;
}
