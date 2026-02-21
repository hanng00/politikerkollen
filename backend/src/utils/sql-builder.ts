/**
 * Lightweight SQL query builder for MotherDuck queries.
 * Provides type-safe column references and CTE composition.
 */

// =============================================================================
// Column Definitions - Type-safe references to mart table columns
// =============================================================================

/** mart_person table columns */
export const PersonColumns = {
  intressent_id: 'intressent_id',
  tilltalsnamn: 'tilltalsnamn',
  efternamn: 'efternamn',
  namn: 'namn',
  sorteringsnamn: 'sorteringsnamn',
  parti: 'parti',
  valkrets: 'valkrets',
  status: 'status',
  fodd_ar: 'fodd_ar',
  kon: 'kon',
  bild_url_80: 'bild_url_80',
  bild_url_192: 'bild_url_192',
  bild_url_max: 'bild_url_max',
  total_actions: 'total_actions',
  total_votes: 'total_votes',
  total_speeches: 'total_speeches',
  total_authored: 'total_authored',
  rebel_vote_count: 'rebel_vote_count',
  first_action_date: 'first_action_date',
  last_action_date: 'last_action_date',
} as const;

/** mart_person_timeline table columns */
export const TimelineColumns = {
  intressent_id: 'intressent_id',
  tilltalsnamn: 'tilltalsnamn',
  efternamn: 'efternamn',
  namn: 'namn',
  parti: 'parti',
  valkrets: 'valkrets',
  person_status: 'person_status',
  action_type: 'action_type',
  action_date: 'action_date',
  action_id: 'action_id',
  vote_value: 'vote_value',
  vote_punkt: 'vote_punkt',
  vote_avser: 'vote_avser',
  subject_title: 'subject_title',
  subject_text: 'subject_text',
  subject_decision_type: 'subject_decision_type',
  subject_winner: 'subject_winner',
  betankande_dok_id: 'betankande_dok_id',
  betankande_beteckning: 'betankande_beteckning',
  betankande_titel: 'betankande_titel',
  betankande_organ: 'betankande_organ',
  speech_text: 'speech_text',
  speech_text_clean: 'speech_text_clean',
  speech_activity_type: 'speech_activity_type',
  speech_number: 'speech_number',
  speech_is_reply: 'speech_is_reply',
  speech_sub_title: 'speech_sub_title',
  speech_protocol_url: 'speech_protocol_url',
  speech_debate_type: 'speech_debate_type',
  authored_dok_id: 'authored_dok_id',
  authored_dok_titel: 'authored_dok_titel',
  authored_dok_typ: 'authored_dok_typ',
  authored_roll: 'authored_roll',
} as const;

export type PersonColumn = keyof typeof PersonColumns;
export type TimelineColumn = keyof typeof TimelineColumns;

// =============================================================================
// Schema & Table References
// =============================================================================

export const SCHEMA = 'main_mart';

export const Tables = {
  person: `${SCHEMA}.mart_person`,
  timeline: `${SCHEMA}.mart_person_timeline`,
} as const;

// =============================================================================
// SQL Helpers
// =============================================================================

/** Escape a string for SQL (prevent injection) */
export function esc(value: string): string {
  return value.replace(/'/g, "''");
}

/** Wrap value in single quotes */
export function quote(value: string): string {
  return `'${esc(value)}'`;
}

/** Create a column reference with optional alias prefix */
export function col(column: string, alias?: string): string {
  return alias ? `${alias}.${column}` : column;
}

// =============================================================================
// Condition Builders
// =============================================================================

export interface Condition {
  sql: string;
}

/** Equal condition */
export function eq(column: string, value: string | number, alias?: string): Condition {
  const colRef = col(column, alias);
  const val = typeof value === 'string' ? quote(value) : value;
  return { sql: `${colRef} = ${val}` };
}

/** IN condition */
export function inList(column: string, values: string[], alias?: string): Condition {
  const colRef = col(column, alias);
  const list = values.map(quote).join(', ');
  return { sql: `${colRef} IN (${list})` };
}

/** Greater than or equal */
export function gte(column: string, value: string | number, alias?: string): Condition {
  const colRef = col(column, alias);
  const val = typeof value === 'string' ? quote(value) : value;
  return { sql: `${colRef} >= ${val}` };
}

/** Less than or equal */
export function lte(column: string, value: string | number, alias?: string): Condition {
  const colRef = col(column, alias);
  const val = typeof value === 'string' ? quote(value) : value;
  return { sql: `${colRef} <= ${val}` };
}

/** Less than */
export function lt(column: string, value: string | number, alias?: string): Condition {
  const colRef = col(column, alias);
  const val = typeof value === 'string' ? quote(value) : value;
  return { sql: `${colRef} < ${val}` };
}

/** IS NOT NULL */
export function isNotNull(column: string, alias?: string): Condition {
  return { sql: `${col(column, alias)} IS NOT NULL` };
}

/** NOT EQUAL */
export function neq(column: string, value: string, alias?: string): Condition {
  return { sql: `${col(column, alias)} != ${quote(value)}` };
}

/** Fuzzy search using jaro_winkler_similarity */
export function fuzzyMatch(column: string, searchTerm: string, threshold = 0.6, alias?: string): Condition {
  const colRef = col(column, alias);
  return { sql: `jaro_winkler_similarity(${quote(searchTerm)}, ${colRef}) > ${threshold}` };
}

/** Combine conditions with AND */
export function and(...conditions: (Condition | undefined | null | false)[]): Condition {
  const valid = conditions.filter((c): c is Condition => Boolean(c));
  if (valid.length === 0) return { sql: '1=1' };
  if (valid.length === 1) return { sql: valid[0]!.sql };
  return { sql: valid.map(c => c.sql).join(' AND ') };
}

/** Combine conditions with OR */
export function or(...conditions: (Condition | undefined | null | false)[]): Condition {
  const valid = conditions.filter((c): c is Condition => Boolean(c));
  if (valid.length === 0) return { sql: '1=1' };
  if (valid.length === 1) return { sql: valid[0]!.sql };
  return { sql: `(${valid.map(c => c.sql).join(' OR ')})` };
}

// =============================================================================
// CTE Builder
// =============================================================================

export interface CTE {
  name: string;
  sql: string;
}

/** Create a CTE definition */
export function cte(name: string, sql: string): CTE {
  return { name, sql: sql.trim() };
}

// =============================================================================
// Query Builder
// =============================================================================

export interface QueryBuilderOptions {
  ctes?: CTE[];
  select: string;
  from: string;
  joins?: string[];
  where?: Condition;
  groupBy?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/** Build a complete SQL query */
export function buildQuery(options: QueryBuilderOptions): string {
  const parts: string[] = [];

  // CTEs
  if (options.ctes && options.ctes.length > 0) {
    const cteList = options.ctes.map(c => `${c.name} AS (\n${indent(c.sql)}\n)`).join(',\n');
    parts.push(`WITH ${cteList}`);
  }

  // SELECT
  parts.push(`SELECT ${options.select}`);

  // FROM
  parts.push(`FROM ${options.from}`);

  // JOINs
  if (options.joins) {
    parts.push(...options.joins);
  }

  // WHERE
  if (options.where && options.where.sql !== '1=1') {
    parts.push(`WHERE ${options.where.sql}`);
  }

  // GROUP BY
  if (options.groupBy) {
    parts.push(`GROUP BY ${options.groupBy}`);
  }

  // ORDER BY
  if (options.orderBy) {
    parts.push(`ORDER BY ${options.orderBy}`);
  }

  // LIMIT
  if (options.limit !== undefined) {
    parts.push(`LIMIT ${options.limit}`);
  }

  // OFFSET
  if (options.offset !== undefined) {
    parts.push(`OFFSET ${options.offset}`);
  }

  return parts.join('\n');
}

/** Indent SQL for readability */
function indent(sql: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return sql.split('\n').map(line => pad + line).join('\n');
}

// =============================================================================
// Common Query Patterns
// =============================================================================

/** Build ORDER BY clause for politician sorting */
export function politicianOrderBy(sortBy: string, searchTerm?: string, alias?: string): string {
  if (searchTerm?.trim()) {
    const colRef = col(PersonColumns.namn, alias);
    return `jaro_winkler_similarity(${quote(searchTerm.trim())}, ${colRef}) DESC`;
  }

  const prefix = alias ? `${alias}.` : '';
  
  switch (sortBy) {
    case 'mostActive':
      return `(COALESCE(${prefix}total_votes, 0) + COALESCE(${prefix}total_speeches, 0) + COALESCE(${prefix}total_authored, 0)) DESC`;
    case 'mostVotes':
      return `COALESCE(${prefix}total_votes, 0) DESC`;
    case 'mostSpeeches':
      return `COALESCE(${prefix}total_speeches, 0) DESC`;
    case 'mostRebel':
      return `COALESCE(${prefix}rebel_vote_count, 0) DESC`;
    case 'name':
    default:
      return `${prefix}sorteringsnamn ASC`;
  }
}

/** Build stats aggregation CTE from timeline */
export function buildTimelineStatsCTE(
  cteName: string,
  dateConditions: Condition[],
): CTE {
  const where = dateConditions.length > 0 
    ? `WHERE ${and(...dateConditions).sql}`
    : '';

  return cte(cteName, `
SELECT 
  ${TimelineColumns.intressent_id},
  COUNT(*) FILTER (WHERE ${TimelineColumns.action_type} = 'vote') as total_votes,
  COUNT(*) FILTER (WHERE ${TimelineColumns.action_type} = 'speech') as total_speeches,
  COUNT(*) FILTER (WHERE ${TimelineColumns.action_type} = 'authored') as total_authored,
  COUNT(*) as total_actions,
  MIN(${TimelineColumns.action_date}) as first_action_date,
  MAX(${TimelineColumns.action_date}) as last_action_date
FROM ${Tables.timeline}
${where}
GROUP BY ${TimelineColumns.intressent_id}
  `.trim());
}
