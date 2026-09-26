import { billingMonthKey, billingMonthToDateInput, formatMonthLabel } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import {
  ELECTRICITY_SELLING_RATE,
  roundCurrency,
} from "@/lib/propertyBillingCalculations";
import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import type {
  Bill,
  BillPaymentMethod,
  BillPaymentStatus,
  BillingPeriodSummary,
  PaymentActivity,
} from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

function toPaymentStatus(status: string): BillPaymentStatus {
  const label = normalizeBillingStatusLabel(status);
  if (label === "Paid" || label === "Partial") return label;
  return "Unpaid";
}

function buildBillId(row: SheetRow, room: number): string {
  const key = billingMonthKey(String(row.Month));
  const suffix = key.replace("-", "") || String(room).padStart(3, "0");
  return `BILL-${suffix}${String(room).padStart(3, "0")}`;
}

function toIsoDate(value: string | null | undefined, fallback: string): string {
  const tryParse = (raw: string): string | null => {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  if (value) {
    const parsed = tryParse(value.trim());
    if (parsed) return parsed;
  }

  if (fallback) {
    const parsed = tryParse(fallback.trim());
    if (parsed) return parsed;
  }

  return new Date().toISOString().slice(0, 10);
}

export function sheetRowToBill(
  row: SheetRow,
  tenant: TenantRecord | undefined,
): Bill {
  const room = readRoom(row.Room);
  const rent = readSheetNumber(row.Rent);
  const elecBill = readSheetNumber(row.ElecBill);
  const waterBill = readSheetNumber(row.WaterBill);
  const otherCharges = readSheetNumber(row.Adjustment);
  const totalDue = roundCurrency(rent + elecBill + waterBill + otherCharges);
  const amountPaid = readSheetNumber(row.Paid);
  const balance = roundCurrency(totalDue - amountPaid);
  const eRate = readSheetNumber(row.ElecRate) || ELECTRICITY_SELLING_RATE;
  const month = String(row.Month);

  return {
    id: buildBillId(row, room),
    room,
    unitCode: tenant?.UnitCode ?? "—",
    tenantName: tenant?.Name ?? "—",
    billingPeriod: formatMonthLabel(month),
    billingMonth: month,
    billingDate: toIsoDate(row.BillingDate, month),
    dueDate: toIsoDate(row.DueDate, month),
    baseRent: rent,
    electricity: {
      amount: elecBill,
      previous: readSheetNumber(row.ElecPrev),
      current: readSheetNumber(row.ElecCurr),
      specialRate: eRate !== ELECTRICITY_SELLING_RATE,
    },
    water: {
      amount: waterBill,
      previous: readSheetNumber(row.WaterPrev),
      current: readSheetNumber(row.WaterCurr),
    },
    otherCharges,
    totalDue,
    amountPaid,
    balance,
    status: toPaymentStatus(String(row.Status ?? "")),
    datePaid: row.DatePaid ? String(row.DatePaid) : null,
    notes: row.Notes ? String(row.Notes) : "",
    paymentActivities: mapSheetPaymentActivities(row),
  };
}

function mapSheetPaymentActivities(row: SheetRow): PaymentActivity[] {
  const fromDb = (row.PaymentActivities ?? []).map((activity) => ({
    id: activity.id,
    paymentDate: activity.paymentDate,
    amount: activity.amount,
    method: toPaymentMethod(activity.method),
    reference: activity.reference ?? "",
  }));

  if (fromDb.length > 0) return fromDb;

  // Legacy: payment lines previously stored in Notes.
  return parseLegacyPaymentActivitiesFromNotes(
    row.Notes ? String(row.Notes) : "",
  );
}

function toPaymentMethod(value: string): BillPaymentMethod {
  const normalized = value.trim().toLowerCase();
  if (normalized === "cash") return "cash";
  if (normalized === "bank" || normalized === "bank transfer") return "bank";
  if (normalized === "online") return "online";
  return "other";
}

/** Parse older Notes-embedded payment lines into structured activities. */
export function parseLegacyPaymentActivitiesFromNotes(
  notes: string,
): PaymentActivity[] {
  if (!notes.trim()) return [];

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isPaymentActivityLine(line))
    .map((line, index) => {
      const payMatch = line.match(
        /^\[PAY\]\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\|\s*₱?\s*([\d,]+(?:\.\d+)?)\s*(?:\|\s*Ref:\s*(.*))?$/i,
      );
      if (payMatch) {
        return {
          id: `legacy-${index}`,
          paymentDate: payMatch[1],
          method: toPaymentMethod(payMatch[2]),
          amount: Number(payMatch[3].replace(/,/g, "")) || 0,
          reference: (payMatch[4] ?? "").trim(),
        };
      }

      const classicMatch = line.match(
        /^(CASH|BANK TRANSFER|ONLINE|PAYMENT)\s*-\s*₱?\s*([\d,]+(?:\.\d+)?)(?:\s*Reference\/Notes:\s*(.*))?$/i,
      );
      if (classicMatch) {
        return {
          id: `legacy-${index}`,
          paymentDate: "",
          method: toPaymentMethod(classicMatch[1]),
          amount: Number(classicMatch[2].replace(/,/g, "")) || 0,
          reference: (classicMatch[3] ?? "").trim(),
        };
      }

      return {
        id: `legacy-${index}`,
        paymentDate: "",
        method: "other" as const,
        amount: 0,
        reference: line,
      };
    });
}

export function buildBillsForRoom(
  billingRows: SheetRow[],
  tenants: TenantRecord[],
  room: number,
  fromDate?: string,
  toDate?: string,
): Bill[] {
  const tenant = tenants.find((item) => item.Room === room);
  const fromKey = fromDate ? billingMonthKey(fromDate) : "";
  const toKey = toDate ? billingMonthKey(toDate) : "";

  const filtered = billingRows
    .filter((row) => readRoom(row.Room) === room)
    .filter((row) => {
      const rowKey = billingMonthKey(String(row.Month));
      if (!rowKey) return true;
      if (fromKey && rowKey < fromKey) return false;
      if (toKey && rowKey > toKey) return false;
      return true;
    });

  // One bill per calendar month — prefer the row with more paid / activity
  // (guards against duplicate billing_month dates like 2026-07-01 vs 2026-07-31).
  const byMonth = new Map<string, SheetRow>();
  for (const row of filtered) {
    const key = billingMonthKey(String(row.Month)) || String(row.Month);
    const existing = byMonth.get(key);
    if (!existing) {
      byMonth.set(key, row);
      continue;
    }
    const existingPaid = readSheetNumber(existing.Paid);
    const nextPaid = readSheetNumber(row.Paid);
    const existingActs = existing.PaymentActivities?.length ?? 0;
    const nextActs = row.PaymentActivities?.length ?? 0;
    if (
      nextActs > existingActs ||
      (nextActs === existingActs && nextPaid >= existingPaid)
    ) {
      byMonth.set(key, row);
    }
  }

  return Array.from(byMonth.values())
    .map((row) => sheetRowToBill(row, tenant))
    .sort((a, b) => {
      const keyA = billingMonthKey(a.billingMonth);
      const keyB = billingMonthKey(b.billingMonth);
      if (keyA !== keyB) return keyB.localeCompare(keyA);
      return (
        new Date(b.billingMonth).getTime() - new Date(a.billingMonth).getTime()
      );
    });
}

/** Oldest bill with an open balance — payments clear from earliest unpaid upward. */
export function oldestUnpaidBill(bills: Bill[]): Bill | null {
  const unpaid = [...bills]
    .filter((bill) => bill.balance > 0)
    .sort((a, b) => {
      const keyA = billingMonthKey(a.billingMonth);
      const keyB = billingMonthKey(b.billingMonth);
      if (keyA !== keyB) return keyA.localeCompare(keyB);
      return (
        new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime()
      );
    });
  return unpaid[0] ?? null;
}

/**
 * Earliest billing month key (YYYY-MM) that belongs to the current occupant.
 * Prefers Move-in, then Lease Start — so prior-occupant bills stay hidden.
 */
export function tenantOccupancyFromDate(
  tenant: TenantRecord | undefined,
): string {
  if (!tenant) return "";
  return (
    billingMonthToDateInput(tenant.MoveIn) ||
    billingMonthToDateInput(tenant.LeaseStart) ||
    ""
  );
}

export function summarizeBills(bills: Bill[]): BillingPeriodSummary {
  const amountDue = roundCurrency(bills.reduce((sum, bill) => sum + bill.totalDue, 0));
  const paid = roundCurrency(bills.reduce((sum, bill) => sum + bill.amountPaid, 0));
  const balance = roundCurrency(bills.reduce((sum, bill) => sum + bill.balance, 0));

  let status: BillPaymentStatus = "Paid";
  if (balance > 0 && paid > 0) status = "Partial";
  else if (balance > 0) status = "Unpaid";

  return { amountDue, paid, balance, status };
}

export function formatStatementPeriod(fromDate: string, toDate: string): string {
  if (!fromDate && !toDate) return "All periods";
  const format = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  if (fromDate && toDate) return `${format(fromDate)} – ${format(toDate)}`;
  return format(fromDate || toDate);
}

/** Compact uppercase label for invoice headers (e.g. JULY - AUGUST 2026). */
export function formatStatementPeriodCompact(
  fromDate: string,
  toDate: string,
): string {
  if (!fromDate && !toDate) return "ALL PERIODS";

  const formatMonth = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.toUpperCase();
    return date.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  };

  const formatYear = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return String(date.getFullYear());
  };

  const fromMonth = formatMonth(fromDate);
  const toMonth = formatMonth(toDate || fromDate);
  const fromYear = formatYear(fromDate);
  const toYear = formatYear(toDate || fromDate);

  if (fromMonth === toMonth && fromYear === toYear) {
    return `${fromMonth} ${toYear}`.trim();
  }

  if (fromYear && toYear && fromYear !== toYear) {
    return `${fromMonth} ${fromYear} - ${toMonth} ${toYear}`.trim();
  }

  return `${fromMonth} - ${toMonth} ${toYear}`.trim();
}

export function formatBillDateBlock(dateValue: string): {
  month: string;
  day: string;
  year: string;
} {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return { month: "—", day: "—", year: "—" };
  }
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(date.getDate()).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

export function isPaymentActivityLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^\[PAY\]/i.test(trimmed) ||
    /^(CASH|BANK TRANSFER|ONLINE|PAYMENT)/i.test(trimmed)
  );
}

/** Payment lines stored in Notes (from Pay Balance). */
export function parsePaymentActivityLines(notes?: string): string[] {
  if (!notes?.trim()) return [];
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isPaymentActivityLine(line));
}

/** User-facing notes only — excludes payment activity lines. */
export function billUserNotes(notes?: string): string {
  if (!notes?.trim()) return "";
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isPaymentActivityLine(line))
    .join("\n");
}

export function formatPaymentMethodLabel(method: BillPaymentMethod | string): string {
  switch (String(method).toLowerCase()) {
    case "cash":
      return "CASH";
    case "bank":
    case "bank transfer":
      return "BANK TRANSFER";
    case "online":
      return "ONLINE";
    default:
      return "PAYMENT";
  }
}

/** One display line: date · method - amount · Ref: … */
export function formatPaymentActivityLine(activity: PaymentActivity): string {
  const parts: string[] = [];
  if (activity.paymentDate) {
    const date = new Date(activity.paymentDate);
    parts.push(
      Number.isNaN(date.getTime())
        ? activity.paymentDate
        : date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
    );
  }
  parts.push(
    `${formatPaymentMethodLabel(activity.method)} - ₱${activity.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  );
  if (activity.reference.trim()) {
    parts.push(`Ref: ${activity.reference.trim()}`);
  }
  return parts.join(" · ");
}

/** Sheets / legacy fallback line stored in Notes when payment_activities is unavailable. */
export function buildPaymentActivityNoteLine(activity: {
  paymentDate: string;
  method: string;
  amount: number;
  reference?: string;
}): string {
  const ref = activity.reference?.trim()
    ? ` | Ref: ${activity.reference.trim()}`
    : "";
  return `[PAY] ${activity.paymentDate} | ${formatPaymentMethodLabel(activity.method)} | ₱${activity.amount.toFixed(2)}${ref}`;
}
