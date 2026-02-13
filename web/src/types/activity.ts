import type { Vote } from "./vote";
import type { Motion } from "./motion";
import type { Speech } from "./speech";
import type { Contradiction } from "./contradiction";

export type ActivityType = "vote" | "motion" | "speech" | "contradiction";

export type ActivityItem = 
  | { type: "vote"; data: Vote }
  | { type: "motion"; data: Motion }
  | { type: "speech"; data: Speech }
  | { type: "contradiction"; data: Contradiction };

export interface ActivityFeed {
  items: ActivityItem[];
  hasMore: boolean;
  nextCursor?: string;
}
