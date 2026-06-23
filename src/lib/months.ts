const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function isIsoMonth(month: string): boolean {
  return month.includes("T");
}

export function formatMonthLabel(month: string): string {
  if (isIsoMonth(month)) {
    return new Date(month).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  return month;
}

export function monthChartLabel(month: string): string {
  if (isIsoMonth(month)) {
    return new Date(month).toLocaleString("en-US", { month: "short" });
  }
  const short: Record<string, string> = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec",
  };
  return short[month] ?? month.slice(0, 3);
}

export function sortMonths(months: string[]): string[] {
  return [...months].sort((a, b) => {
    if (isIsoMonth(a) && isIsoMonth(b)) {
      return new Date(a).getTime() - new Date(b).getTime();
    }
    const ai = MONTH_NAMES.indexOf(a as (typeof MONTH_NAMES)[number]);
    const bi = MONTH_NAMES.indexOf(b as (typeof MONTH_NAMES)[number]);
    return ai - bi;
  });
}

function parseBillingMonthDate(month: string): Date | null {
  if (!month) return null;

  const direct = new Date(month);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withDay = new Date(`${month} 1`);
  if (!Number.isNaN(withDay.getTime())) return withDay;

  return null;
}

/** Calendar month key (YYYY-MM) for comparing billing sheet month values. */
export function billingMonthKey(month: string): string {
  const parsed = parseBillingMonthDate(month);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const monthIndex = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${monthIndex}`;
}

export function billingMonthsMatch(a: string, b: string): boolean {
  const keyA = billingMonthKey(a);
  const keyB = billingMonthKey(b);
  return keyA !== "" && keyA === keyB;
}

/** Date input value (YYYY-MM-DD) for the first day of a billing month. */
export function billingMonthToDateInput(month: string): string {
  const parsed = parseBillingMonthDate(month);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const monthIndex = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${monthIndex}-01`;
}

export function resolveBillingMonthValue(
  existingMonths: string[],
  targetMonth: string,
  fallback: string,
): string {
  const targetKey = billingMonthKey(targetMonth);
  if (!targetKey) return fallback;

  const existing = existingMonths.find(
    (month) => billingMonthKey(month) === targetKey,
  );
  if (existing) return existing;

  if (billingMonthsMatch(fallback, targetMonth)) return fallback;

  const parsed = parseBillingMonthDate(targetMonth);
  if (parsed) {
    return parsed.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  return fallback;
}

export { MONTH_NAMES };
