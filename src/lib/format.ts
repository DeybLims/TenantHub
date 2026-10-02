import { formatManilaDate } from "@/lib/manilaTime";

export function formatPeso(value: number): string {
  return `₱ ${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function formatPesoDecimal(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatExpenseAmount(value: number): string {
  return `₱ ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** August 30, 2025 */
export function formatExpenseDate(value: string): string {
  if (!value) return "—";
  return formatManilaDate(value, "MMMM d, yyyy") ?? value;
}

/** Aug 30, 2025 */
export function formatMoveInDate(value: string): string {
  if (!value) return "—";
  return formatManilaDate(value, "MMM d, yyyy") ?? value;
}

/** Table date format: Aug 30, 2025 */
export function formatTableDate(value: string): string {
  if (!value) return "—";
  return formatManilaDate(value, "MMM d, yyyy") ?? value;
}

/** Long date for billing summary: July 04, 2025 */
export function formatLongDate(value: string): string {
  if (!value) return "—";
  return formatManilaDate(value, "MMMM dd, yyyy") ?? value;
}

/** Formats DatePaid from billing; shows placeholder when unpaid or missing. */
export function formatDatePaid(
  datePaid: string | null | undefined,
  billingStatus: string,
): string | null {
  if (billingStatus.trim().toLowerCase() === "unpaid") {
    return null;
  }

  const raw = datePaid != null ? String(datePaid).trim() : "";
  if (!raw) return null;

  return formatManilaDate(raw, "MMM d, yyyy") ?? raw;
}
