import type { Topic } from "./topic";

export type PromiseStatus = 
  | "kept" 
  | "broken" 
  | "in_progress" 
  | "stalled" 
  | "not_started";

export interface Promise {
  id: string;
  politicianId: string;
  date: string;
  statement: string;
  source: string;
  sourceUrl?: string;
  topic: Topic;
  status: PromiseStatus;
  statusUpdatedAt: string;
  evidence: {
    date: string;
    description: string;
    sourceUrl?: string;
  }[];
}
