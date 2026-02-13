export interface Constituency {
  id: string;
  name: string;
  slug: string;
  seats: number;
}

export interface CandidateScore {
  politicianId: string;
  topicId: string;
  /** Score from -100 (strongly against) to +100 (strongly for) */
  score: number;
  /** Number of votes/actions this score is based on */
  actionCount: number;
}

export interface VoterGuideResult {
  constituency: Constituency;
  selectedTopics: string[];
  candidates: CandidateWithScores[];
}

export interface CandidateWithScores {
  politicianId: string;
  overallMatch: number;
  topicScores: Record<string, CandidateScore>;
}
