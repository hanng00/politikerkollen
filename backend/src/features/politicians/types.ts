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
  authored_dok_id: string | null;
  authored_dok_titel: string | null;
  authored_dok_typ: string | null;
  authored_roll: string | null;
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
  };
}

export interface PoliticianDetail extends PoliticianSummary {
  birthYear: number | null;
  gender: string | null;
  firstActionDate: string | null;
  lastActionDate: string | null;
}

export interface TimelineItem {
  id: string;
  type: 'vote' | 'speech' | 'authored';
  date: string;
  title: string | null;
  // Vote-specific
  voteValue?: string;
  votePunkt?: string;
  subjectText?: string;
  betankandeId?: string;
  betankandeTitel?: string;
  // Speech-specific
  speechText?: string;
  activityType?: string;
  // Authored-specific
  documentId?: string;
  documentType?: string;
  authorRole?: string;
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
    },
  };
}

export function toDetail(row: MartPerson): PoliticianDetail {
  return {
    ...toSummary(row),
    birthYear: row.fodd_ar,
    gender: row.kon,
    firstActionDate: row.first_action_date,
    lastActionDate: row.last_action_date,
  };
}

export function toTimelineItem(row: MartPersonTimeline): TimelineItem {
  const base: TimelineItem = {
    id: row.action_id,
    type: row.action_type,
    date: row.action_date,
    title: row.subject_title,
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
      // Truncate speech text for list view
      speechText: row.speech_text_clean?.slice(0, 500) ?? undefined,
      activityType: row.speech_activity_type ?? undefined,
    };
  }

  // authored
  return {
    ...base,
    documentId: row.authored_dok_id ?? undefined,
    documentType: row.authored_dok_typ ?? undefined,
    authorRole: row.authored_roll ?? undefined,
  };
}
