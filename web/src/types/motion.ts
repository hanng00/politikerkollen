import type { Topic } from "./topic";

export type MotionStatus = 
  | "submitted" 
  | "in_committee" 
  | "approved" 
  | "rejected" 
  | "withdrawn";

export interface Motion {
  id: string;
  politicianId: string;
  date: string;
  title: string;
  summary: string;
  topic: Topic;
  documentId: string;
  documentUrl?: string;
  status: MotionStatus;
  committee?: string;
  coAuthors: {
    id: string;
    name: string;
    partyShortName: string;
  }[];
}
