import type { Topic } from "./topic";

export interface Speech {
  id: string;
  politicianId: string;
  date: string;
  title: string;
  excerpt: string;
  fullText?: string;
  topic: Topic;
  debate: string;
  durationSeconds: number;
  videoUrl?: string;
  documentUrl?: string;
  isHighlighted?: boolean;
}
