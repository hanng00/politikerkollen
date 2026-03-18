/**
 * MotherDuck client for querying mart tables.
 * Uses the Postgres wire protocol endpoint — no native DuckDB binaries needed.
 *
 * Connection is established eagerly during Lambda init phase so the first
 * request doesn't pay the ~900ms TLS + auth overhead.
 */

import pg from 'pg';
import { getMotherDuckToken } from './secrets';

const DATABASE = 'spatial_dagster';

interface QueryResult<T> {
  data: T[];
  meta: {
    rowCount: number;
  };
}

let client: pg.Client | null = null;
let connectPromise: Promise<pg.Client> | null = null;

function createClient(): Promise<pg.Client> {
  const token = getMotherDuckToken();
  console.log('Connecting to MotherDuck via Postgres endpoint...');

  const c = new pg.Client({
    host: 'pg.us-east-1-aws.motherduck.com',
    port: 5432,
    user: 'postgres',
    password: token,
    database: DATABASE,
    ssl: { rejectUnauthorized: true },
  });

  c.on('error', (err) => {
    console.error('MotherDuck connection error, will reconnect:', err.message);
    client = null;
    connectPromise = null;
  });

  return c.connect().then(() => {
    console.log('MotherDuck connection established');
    client = c;
    return c;
  });
}

async function getClient(): Promise<pg.Client> {
  if (client) return client;
  if (!connectPromise) connectPromise = createClient();
  return connectPromise;
}

// Eagerly start connection during Lambda init (outside the handler).
// This runs during the init phase so the first invocation doesn't wait.
connectPromise = createClient();

/**
 * Execute a SQL query against MotherDuck and return typed rows.
 * Connection is cached for reuse across Lambda invocations (warm starts).
 */
export async function query<T = Record<string, unknown>>(sql: string): Promise<QueryResult<T>> {
  const conn = await getClient();
  const result = await conn.query(sql);

  return {
    data: result.rows as T[],
    meta: {
      rowCount: result.rows.length,
    },
  };
}

/**
 * Execute a raw SQL statement (e.g. CREATE TEMP TABLE).
 * Returns the pg.QueryResult for advanced use cases.
 */
export async function execute(sql: string): Promise<pg.QueryResult> {
  const conn = await getClient();
  return conn.query(sql);
}

/**
 * Keepalive ping — run SELECT 1 to keep the MotherDuck session alive.
 * Called by scheduled CloudWatch events.
 */
export async function keepalive(): Promise<void> {
  const conn = await getClient();
  await conn.query('SELECT 1');
  console.log('Keepalive ping OK');
}

export { esc as escapeString } from './sql-builder';
