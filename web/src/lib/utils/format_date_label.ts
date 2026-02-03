/**
 * Intelligently formats date-like strings for chart labels.
 * Attempts to parse common date formats and returns a human-readable format.
 * Returns the original string if it doesn't look like a date.
 */
export function formatDateLabel(value: string): string {
  if (!value || typeof value !== "string") {
    return String(value ?? "");
  }

  const trimmed = value.trim();

  // YYYY-MM format (e.g., "2025-06")
  const yearMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    const monthNum = parseInt(month, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${monthNames[monthNum - 1]} ${year}`;
    }
  }

  // YYYY-MM-DD format (e.g., "2025-06-15")
  const yearMonthDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yearMonthDayMatch) {
    const [, year, month, day] = yearMonthDayMatch;
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${monthNames[monthNum - 1]} ${day}, ${year}`;
    }
  }

  // YYYY format (e.g., "2025")
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // If it doesn't match any date pattern, return as-is
  return trimmed;
}
