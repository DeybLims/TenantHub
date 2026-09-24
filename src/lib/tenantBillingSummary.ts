import { calculateBillingTotalDue } from "@/lib/buildUpdateBillPayload";
import { billingMonthKey, billingMonthToDateInput } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export interface TenantBillingSummary {
  currentBalance: number;
  status: string;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  nextDueDate: string | null;
  daysUntilDue: number | null;
}

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

function endOfMonthDate(month: string): Date | null {
  if (!month) return null;
  const parsed = new Date(month);
  if (Number.isNaN(parsed.getTime())) {
    const withDay = new Date(`${month} 1`);
    if (Number.isNaN(withDay.getTime())) return null;
    return new Date(withDay.getFullYear(), withDay.getMonth() + 1, 0);
  }
  return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function billTotalDue(billing: SheetRow): number {
  return calculateBillingTotalDue({
    baseRent: String(readSheetNumber(billing.Rent)),
    elecBill: String(readSheetNumber(billing.ElecBill)),
    waterBill: String(readSheetNumber(billing.WaterBill)),
    otherCharges: String(readSheetNumber(billing.Adjustment)),
  });
}

function occupancyFromDate(tenant: TenantRecord | undefined): string {
  if (!tenant) return "";
  return (
    billingMonthToDateInput(tenant.MoveIn) ||
    billingMonthToDateInput(tenant.LeaseStart) ||
    ""
  );
}

/** Bills for this room belonging to the current occupancy window. */
export function filterTenantOccupancyBills(
  billingRows: SheetRow[],
  room: number,
  tenant: TenantRecord | undefined,
): SheetRow[] {
  const fromKey = billingMonthKey(occupancyFromDate(tenant));

  return billingRows
    .filter((row) => readRoom(row.Room) === room)
    .filter((row) => {
      if (!fromKey) return true;
      const rowKey = billingMonthKey(String(row.Month));
      if (!rowKey) return true;
      return rowKey >= fromKey;
    });
}

/**
 * Overall billing summary for Tenant Details — matches Billing statement
 * outstanding (sum of open balances across occupancy bills), not a single month.
 */
export function buildTenantBillingSummary(
  billingRows: SheetRow[],
  room: number,
  tenant: TenantRecord | undefined,
): TenantBillingSummary {
  const bills = filterTenantOccupancyBills(billingRows, room, tenant);

  if (bills.length === 0) {
    return {
      currentBalance: 0,
      status: "No Bill",
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      nextDueDate: null,
      daysUntilDue: null,
    };
  }

  const totalDue = roundCurrency(
    bills.reduce((sum, row) => sum + billTotalDue(row), 0),
  );
  const totalPaid = roundCurrency(
    bills.reduce((sum, row) => sum + readSheetNumber(row.Paid), 0),
  );
  // Net outstanding (matches Billing statement header) — overpayments
  // on one month offset balances on others.
  const currentBalance = roundCurrency(Math.max(0, totalDue - totalPaid));

  let status = "Unpaid";
  if (currentBalance <= 0 && totalDue > 0) status = "Paid";
  else if (totalPaid > 0 && currentBalance > 0) status = "Partial";

  const withPayment = [...bills]
    .filter((row) => readSheetNumber(row.Paid) > 0 && row.DatePaid)
    .sort(
      (a, b) =>
        new Date(String(b.DatePaid)).getTime() -
        new Date(String(a.DatePaid)).getTime(),
    );
  const latestPayment = withPayment[0];

  const latestBill = [...bills].sort(
    (a, b) =>
      new Date(String(b.Month)).getTime() - new Date(String(a.Month)).getTime(),
  )[0];

  const dueDateRaw =
    latestBill.DueDate != null && String(latestBill.DueDate).trim()
      ? String(latestBill.DueDate)
      : null;
  const dueDate = dueDateRaw
    ? new Date(dueDateRaw)
    : endOfMonthDate(String(latestBill.Month));

  return {
    currentBalance,
    status,
    lastPaymentDate: latestPayment?.DatePaid
      ? String(latestPayment.DatePaid)
      : null,
    lastPaymentAmount: latestPayment
      ? readSheetNumber(latestPayment.Paid)
      : 0,
    nextDueDate: dueDate ? toDateInputValue(dueDate.toISOString()) : null,
    daysUntilDue: dueDate ? daysUntil(dueDate) : null,
  };
}
