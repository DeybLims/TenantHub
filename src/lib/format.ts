export function formatPeso(value: number): string {
  return `₱ ${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function formatPesoDecimal(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoveInDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
