export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface TopicStats {
  topic: Topic;
  actionCount: number;
  consistencyScore: number;
}
