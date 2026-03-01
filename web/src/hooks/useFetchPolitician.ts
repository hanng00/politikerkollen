import { useQuery } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// Vote breakdown type
export interface VoteBreakdown {
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
}

// Party loyalty type
export interface PartyLoyalty {
  totalVotes: number;
  votesWithParty: number;
  votesAgainstParty: number;
  loyaltyPercentage: number;
}

// Topic activity type
export interface TopicActivity {
  topic: string;
  committee: string;
  voteCount: number;
  speechCount: number;
  totalCount: number;
}

// Rebel vote type (votes against party majority)
export interface RebelVote {
  voteringId: string;
  date: string;
  personVote: string;
  partyMajorityVote: string;
  betankandeId: string | null;
  betankandeTitel: string | null;
  subjectTitle: string | null;
  topic: string | null;
}

// Rebel votes grouped by topic
export interface RebelVotesByTopic {
  topic: string;
  committee: string;
  count: number;
  recentVotes: RebelVote[];
}

// Bayesian statistics for fair ranking
export interface BayesianStats {
  adjustedPassRate: number;
  rawPassRate: number;
  globalPassRate: number;
  shrinkagePct: number;
  credibleLowerBound: number;
  confidenceTier: "high" | "medium" | "low" | "very_low";
  resolvedMotions: number;
}

// Motion effectiveness metrics
export interface MotionEffectiveness {
  totalMotions: number;
  motionsPassed: number;
  motionsRejected: number;
  motionsPending: number;
  passRate: number;
  avgImpactScore: number;
  topMotion: {
    dokId: string;
    title: string;
    impactScore: number;
    outcome: string | null;
  } | null;
  bifallBreakdown: {
    viaReservation: number;
    viaUtskott: number;
    direktBifall: number;
    tillkannagivanden: number;
    delvisBifall: number;
  };
  bayesianStats?: BayesianStats;
}

// Recent question type
export interface RecentQuestion {
  type: "interpellation" | "skriftlig_fraga";
  title: string;
  date: string;
  dokId: string;
}

// Accountability stats - interpellations and written questions
export interface AccountabilityStats {
  interpellations: number;
  writtenQuestions: number;
  totalQuestions: number;
  recentQuestions: RecentQuestion[];
}

// Key vote type
export interface KeyVote {
  voteringId: string;
  date: string;
  voteValue: string;
  betankandeId: string;
  betankandeTitel: string;
  topic: string | null;
  isRebel: boolean;
  partyMajorityVote: string | null;
}

// API response type (matching backend)
export interface PoliticianDetail {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  birthYear: number | null;
  gender: string | null;
  firstActionDate: string | null;
  lastActionDate: string | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
  };
  voteBreakdown: VoteBreakdown;
  partyLoyalty: PartyLoyalty;
  topTopics: TopicActivity[];
  rebelVotesByTopic: RebelVotesByTopic[];
  motionEffectiveness: MotionEffectiveness;
  keyVotes: KeyVote[];
  accountabilityStats: AccountabilityStats;
}

async function fetchPolitician(id: string): Promise<PoliticianDetail | null> {
  const res = await fetch(`${API_ENDPOINT}/politicians/${id}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch politician: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function useFetchPolitician(id: string) {
  return useQuery({
    queryKey: ["politician", id],
    queryFn: () => fetchPolitician(id),
    enabled: !!id,
  });
}
