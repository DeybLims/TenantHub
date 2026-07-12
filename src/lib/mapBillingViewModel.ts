import { billingMonthKey, formatMonthLabel } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import {
  ELECTRICITY_SELLING_RATE,
  roundCurrency,
} from "@/lib/propertyBillingCalculations";
import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import type {
  Bill,
  BillPaymentStatus,
  BillingPeriodSummary,
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
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
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
    notes: row.Notes ? String(row.Notes) : "",
  };
}

export function buildBillsForRoom(
  billingRows: SheetRow[],
  tenants: TenantRecord[],
  room: number,
  fromDate?: string,
  toDate?: string,
): Bill[] {
  const tenant = tenants.find((item) => item.Room === room);
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  if (to) to.setHours(23, 59, 59, 999);

  return billingRows
    .filter((row) => readRoom(row.Room) === room)
    .filter((row) => {
      const monthDate = new Date(String(row.Month));
      if (Number.isNaN(monthDate.getTime())) return true;
      if (from && monthDate < from) return false;
      if (to && monthDate > to) return false;
      return true;
    })
    .map((row) => sheetRowToBill(row, tenant))
    .sort(
      (a, b) =>
        new Date(b.billingMonth).getTime() - new Date(a.billingMonth).getTime(),
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
