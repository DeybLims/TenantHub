import { calculateBillingTotalDue } from "@/lib/buildUpdateBillPayload";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { SheetRow } from "@/types/sheet";

export interface TenantBillingSummary {
  currentBalance: number;
  status: string;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  nextDueDate: string | null;
  daysUntilDue: number | null;
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

export function buildTenantBillingSummary(
  billing: SheetRow | undefined,
  selectedMonth: string,
): TenantBillingSummary {
  if (!billing) {
    return {
      currentBalance: 0,
      status: "No Bill",
      lastPaymentDate: null,
      lastPaymentAmount: 0,
      nextDueDate: null,
      daysUntilDue: null,
    };
  }

  const rent = readSheetNumber(billing.Rent);
  const elecBill = readSheetNumber(billing.ElecBill);
  const waterBill = readSheetNumber(billing.WaterBill);
  const otherCharges = readSheetNumber(billing.Adjustment);
  const totalDue = calculateBillingTotalDue({
    baseRent: String(rent),
    elecBill: String(elecBill),
    waterBill: String(waterBill),
    otherCharges: String(otherCharges),
  });
  const paid = readSheetNumber(billing.Paid);
  const status = String(billing.Status ?? "Unpaid");

  const dueDateRaw =
    billing.DueDate != null && String(billing.DueDate).trim()
      ? String(billing.DueDate)
      : null;
  const dueDate = dueDateRaw
    ? new Date(dueDateRaw)
    : endOfMonthDate(selectedMonth || billing.Month);

  const lastPaymentDate =
    paid > 0 && billing.DatePaid
      ? String(billing.DatePaid)
      : null;

  return {
    currentBalance: Math.max(0, totalDue - paid),
    status,
    lastPaymentDate,
    lastPaymentAmount: paid,
    nextDueDate: dueDate ? toDateInputValue(dueDate.toISOString()) : null,
    daysUntilDue: dueDate ? daysUntil(dueDate) : null,
  };
}
