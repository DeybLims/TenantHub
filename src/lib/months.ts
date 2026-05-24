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

export { MONTH_NAMES };
