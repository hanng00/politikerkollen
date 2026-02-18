/**
 * MotherDuck client for querying mart tables
 * Uses @duckdb/node-api for native DuckDB connection to MotherDuck
 */

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { getMotherDuckToken } from './secrets';

const DATABASE = 'spatial_dagster';

interface QueryResult<T> {
  data: T[];
  meta: {
    rowCount: number;
  };
}

// Connection singleton - reused across Lambda invocations (warm starts)
let connection: DuckDBConnection | null = null;

/**
 * Get or create a connection to MotherDuck
 * Connection is cached for reuse across Lambda invocations
 */
async function getConnection(): Promise<DuckDBConnection> {
  if (!connection) {
    const token = getMotherDuckToken();
    const connectionString = `md:${DATABASE}?motherduck_token=${token}`;

    console.log('Creating new MotherDuck connection...');
    const instance = await DuckDBInstance.create(connectionString);
    connection = await instance.connect();
    console.log('MotherDuck connection established');
  }
  return connection;
}

/**
 * Execute a SQL query against MotherDuck
 * IMPORTANT: Only query from main_mart schema to enforce contract
 */
export async function query<T = Record<string, unknown>>(sql: string): Promise<QueryResult<T>> {
  const conn = await getConnection();

  const reader = await conn.runAndReadAll(sql);
  const data = reader.getRowObjectsJson() as T[];

  return {
    data,
    meta: {
      rowCount: data.length,
    },
  };
}

// Re-export SQL utilities from sql-builder for backwards compatibility
export { esc as escapeString } from './sql-builder';
