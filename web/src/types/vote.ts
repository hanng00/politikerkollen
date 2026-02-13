import type { Topic } from "./topic";

export type VotePosition = "yes" | "no" | "abstain" | "absent";

export interface Vote {
  id: string;
  politicianId: string;
  date: string;
  title: string;
  description: string;
  topic: Topic;
  position: VotePosition;
  partyLine: VotePosition;
  followedParty: boolean;
  documentId: string;
  documentUrl?: string;
  voteResult: {
    yes: number;
    no: number;
    abstain: number;
    absent: number;
    passed: boolean;
  };
}
