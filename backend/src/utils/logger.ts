/**
 * Structured logger for Lambda / CloudWatch.
 *
 * CloudWatch treats every newline as a separate log entry.
 * These helpers collapse multi-line strings (SQL, JSON, etc.)
 * so each logical log statement stays on one line.
 */

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function logSql(prefix: string, sql: string): void {
  console.log(prefix, collapse(sql));
}
