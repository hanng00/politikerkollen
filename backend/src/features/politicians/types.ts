/**
 * Types for the politicians API
 */

// Database row types (from mart tables)
export interface MartPerson {
  intressent_id: string;
  tilltalsnamn: string;
  efternamn: string;
  namn: string;
  sorteringsnamn: string;
  parti: string;
  valkrets: string;
  status: string;
  fodd_ar: number | null;
  kon: string | null;
  bild_url_80: string | null;
  bild_url_192: string | null;
  bild_url_max: string | null;
  total_actions: number;
  total_votes: number;
  total_speeches: number;
  total_authored: number;
  rebel_vote_count: number;
  first_action_date: string | null;
  last_action_date: string | null;
}

export interface MartPersonTimeline {
  intressent_id: string;
  tilltalsnamn: string;
  efternamn: string;
  namn: string;
  parti: string;
  valkrets: string;
  person_status: string;
  action_type: 'vote' | 'speech' | 'authored';
  action_date: string;
  action_id: string;
  vote_value: string | null;
  vote_punkt: string | null;
  vote_avser: string | null;
  subject_title: string | null;
  subject_text: string | null;
  subject_decision_type: string | null;
  subject_winner: string | null;
  betankande_dok_id: string | null;
  betankande_beteckning: string | null;
  betankande_titel: string | null;
  betankande_organ: string | null;
  speech_text: string | null;
  speech_text_clean: string | null;
  speech_activity_type: string | null;
  speech_number: number | null;
  speech_is_reply: string | null;
  speech_sub_title: string | null;
  speech_protocol_url: string | null;
  speech_debate_type: string | null;
  authored_dok_id: string | null;
  authored_dok_titel: string | null;
  authored_dok_typ: string | null;
  authored_roll: string | null;
  authored_stakeholders: string | null; // JSON array
}

// API response types
export interface PoliticianSummary {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
    rebelVoteCount: number;
  };
}

export interface VoteBreakdown {
  ja: number;
  nej: number;
  avstar: number;
  franvarande: number;
}

export interface PartyLoyalty {
  totalVotes: number;
  votesWithParty: number;
  votesAgainstParty: number;
  loyaltyPercentage: number;
}

export interface TopicActivity {
  topic: string;
  committee: string;
  voteCount: number;
  speechCount: number;
  totalCount: number;
}

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

export interface PoliticianDetail extends PoliticianSummary {
  birthYear: number | null;
  gender: string | null;
  firstActionDate: string | null;
  lastActionDate: string | null;
  voteBreakdown: VoteBreakdown;
  partyLoyalty: PartyLoyalty;
  topTopics: TopicActivity[];
  rebelVotes: RebelVote[];
}

export interface DocumentStakeholder {
  intressentId: string;
  name: string;
  party: string | null;
  role: 'undertecknare' | 'stalldtill' | 'besvaradav' | 'fragestallare';
}

export interface TimelineItem {
  id: string;
  type: 'vote' | 'speech' | 'authored';
  date: string;
  title: string | null;
  // Topic/committee info
  committee?: string;
  topic?: string;
  // Vote-specific
  voteValue?: string;
  votePunkt?: string;
  subjectText?: string;
  betankandeId?: string;
  betankandeTitel?: string;
  // Speech-specific
  speechText?: string;
  activityType?: string;
  speechNumber?: number;
  isReply?: boolean;
  speechSubTitle?: string;
  protocolUrl?: string;
  debateType?: string;
  debateDocumentId?: string;
  // Authored-specific
  documentId?: string;
  documentType?: string;
  authorRole?: string;
  stakeholders?: DocumentStakeholder[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

// Transform functions
export function toSummary(row: MartPerson): PoliticianSummary {
  return {
    id: row.intressent_id,
    firstName: row.tilltalsnamn,
    lastName: row.efternamn,
    name: row.namn,
    party: row.parti,
    constituency: row.valkrets,
    status: row.status,
    imageUrl: row.bild_url_192,
    stats: {
      totalVotes: row.total_votes,
      totalSpeeches: row.total_speeches,
      totalAuthored: row.total_authored,
      rebelVoteCount: row.rebel_vote_count,
    },
  };
}

export function toDetail(row: MartPerson, voteBreakdown?: VoteBreakdown, partyLoyalty?: PartyLoyalty, topTopics?: TopicActivity[], rebelVotes?: RebelVote[]): PoliticianDetail {
  return {
    ...toSummary(row),
    birthYear: row.fodd_ar,
    gender: row.kon,
    firstActionDate: row.first_action_date,
    lastActionDate: row.last_action_date,
    voteBreakdown: voteBreakdown ?? { ja: 0, nej: 0, avstar: 0, franvarande: 0 },
    partyLoyalty: partyLoyalty ?? { totalVotes: 0, votesWithParty: 0, votesAgainstParty: 0, loyaltyPercentage: 0 },
    topTopics: topTopics ?? [],
    rebelVotes: rebelVotes ?? [],
  };
}

/**
 * Map Swedish parliament committee codes to human-readable topic names
 */
const COMMITTEE_TO_TOPIC: Record<string, string> = {
  AU: 'Arbetsmarknad',
  CU: 'Civilrätt',
  FiU: 'Finans',
  FöU: 'Försvar',
  JuU: 'Justitie',
  KU: 'Konstitution',
  KrU: 'Kultur',
  MJU: 'Miljö & Jordbruk',
  NU: 'Näringsliv',
  SkU: 'Skatter',
  SfU: 'Socialförsäkring',
  SoU: 'Socialutskottet',
  TU: 'Trafik',
  UbU: 'Utbildning',
  UU: 'Utrikes',
  UFöU: 'Sammansatt utrikes/försvar',
};

function getTopicFromCommittee(committee: string | null): string | undefined {
  if (!committee) return undefined;
  return COMMITTEE_TO_TOPIC[committee] ?? committee;
}

export function toTimelineItem(row: MartPersonTimeline): TimelineItem {
  const committee = row.betankande_organ ?? undefined;
  const topic = getTopicFromCommittee(row.betankande_organ);
  
  const base: TimelineItem = {
    id: row.action_id,
    type: row.action_type,
    date: row.action_date,
    title: row.subject_title,
    committee,
    topic,
  };

  if (row.action_type === 'vote') {
    return {
      ...base,
      voteValue: row.vote_value ?? undefined,
      votePunkt: row.vote_punkt ?? undefined,
      subjectText: row.subject_text ?? undefined,
      betankandeId: row.betankande_dok_id ?? undefined,
      betankandeTitel: row.betankande_titel ?? undefined,
    };
  }

  if (row.action_type === 'speech') {
    return {
      ...base,
      speechText: row.speech_text_clean?.slice(0, 500) ?? undefined,
      activityType: row.speech_activity_type ?? undefined,
      speechNumber: row.speech_number ?? undefined,
      isReply: row.speech_is_reply === 'J',
      speechSubTitle: row.speech_sub_title ?? undefined,
      protocolUrl: row.speech_protocol_url ?? undefined,
      debateType: row.speech_debate_type ?? undefined,
      debateDocumentId: row.betankande_dok_id ?? undefined,
      betankandeTitel: row.betankande_titel ?? undefined,
    };
  }

  // authored — use the document's own title, fall back to subject_title from base
  return {
    ...base,
    title: row.authored_dok_titel ?? row.subject_title,
    documentId: row.authored_dok_id ?? undefined,
    documentType: row.authored_dok_typ ?? undefined,
    authorRole: formatAuthorRole(row.authored_roll),
    stakeholders: parseStakeholders(row.authored_stakeholders),
  };
}

const AUTHOR_ROLE_LABELS: Record<string, string> = {
  undertecknare: 'Undertecknare',
  stalldtill: 'Ställd till',
  besvaradav: 'Besvarad av',
  fragestallare: 'Frågeställare',
  huvudman: 'Huvudman',
};

export function formatAuthorRole(role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  return AUTHOR_ROLE_LABELS[role.toLowerCase()] ?? role;
}

function parseStakeholders(json: string | null): DocumentStakeholder[] | undefined {
  if (!json) return undefined;
  try {
    const raw = JSON.parse(json) as Array<{
      intressent_id: string;
      namn: string;
      parti: string | null;
      roll: string;
      ordning: string;
    }>;

    // Deduplicate by intressent_id + roll — the mart JOIN can produce duplicate rows
    const seen = new Set<string>();
    const unique = raw.filter((s) => {
      const key = `${s.intressent_id}:${s.roll}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.map((s) => ({
      intressentId: s.intressent_id,
      name: s.namn,
      party: s.parti,
      role: s.roll as DocumentStakeholder['role'],
    }));
  } catch {
    return undefined;
  }
}
