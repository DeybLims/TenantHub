import { formatInTimeZone } from "date-fns-tz";

/**
 * All business dates (billing, due, payment) are Philippine calendar dates.
 * Never derive them with `toISOString()` — that yields the UTC day, which is
 * yesterday in Manila between 00:00 and 08:00.
 */
export const MANILA_TIME_ZONE = "Asia/Manila";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toInstant(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  // A bare YYYY-MM-DD is a calendar day, so anchor it to Manila midnight.
  const date = new Date(
    ISO_DATE.test(trimmed) ? `${trimmed}T00:00:00+08:00` : trimmed,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaToday(): string {
  return formatInTimeZone(new Date(), MANILA_TIME_ZONE, "yyyy-MM-dd");
}

/** Current Manila month as YYYY-MM. */
export function manilaMonthKey(): string {
  return formatInTimeZone(new Date(), MANILA_TIME_ZONE, "yyyy-MM");
}

/** Current Manila month as a label, e.g. "August 2026". */
export function manilaMonthLabel(): string {
  return formatInTimeZone(new Date(), MANILA_TIME_ZONE, "MMMM yyyy");
}

/**
 * Normalizes a date or timestamp to the Manila calendar day (YYYY-MM-DD).
 * Bare YYYY-MM-DD values pass through unchanged.
 */
export function toManilaDate(
  value: string | Date | null | undefined,
): string | null {
  if (value == null) return null;
  if (typeof value === "string" && ISO_DATE.test(value.trim())) {
    return value.trim();
  }
  const instant = toInstant(value);
  return instant
    ? formatInTimeZone(instant, MANILA_TIME_ZONE, "yyyy-MM-dd")
    : null;
}

/** Formats a stored date for display on the Manila calendar (date-fns pattern). */
export function formatManilaDate(
  value: string | Date | null | undefined,
  pattern: string,
): string | null {
  if (value == null) return null;
  const instant = toInstant(value);
  return instant ? formatInTimeZone(instant, MANILA_TIME_ZONE, pattern) : null;
}
