import { tenantOccupancyFromDate } from "@/lib/mapBillingViewModel";
import { billingMonthKey } from "@/lib/months";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
import { readSheetNumber } from "@/lib/readSheetNumber";
import {
  billingDateToSheetMonth,
  sheetMonthToBillingDate,
} from "@/lib/supabase/mappers";
import type { GenerateBillPayload } from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export const billingRowsQueryKey = ["billing", "rows"] as const;
export const tenantsQueryKey = ["tenants"] as const;

/** Rows the server has confirmed (optimistic placeholders excluded). */
export function committedBillingRows(rows: SheetRow[] | undefined): SheetRow[] {
  return (rows ?? []).filter((row) => !row.Optimistic);
}

export function findCommittedBill(
  rows: SheetRow[] | undefined,
  room: number,
  month: string,
): SheetRow | undefined {
  const key = billingMonthKey(month);
  if (!key) return undefined;
  return committedBillingRows(rows).find(
    (row) =>
      Number(row.Room) === room && billingMonthKey(String(row.Month)) === key,
  );
}

/** First billable month (YYYY-MM) for the room's occupant; "" when unknown. */
export function occupancyMonthKey(tenant: TenantRecord | undefined): string {
  return billingMonthKey(tenantOccupancyFromDate(tenant));
}

function rowTotalDue(row: SheetRow): number {
  return roundCurrency(
    readSheetNumber(row.Rent) +
      readSheetNumber(row.ElecBill) +
      readSheetNumber(row.WaterBill) +
      readSheetNumber(row.Adjustment),
  );
}

function paidStatus(totalDue: number, paid: number): string {
  if (paid >= totalDue) return "Paid";
  return paid > 0 ? "Partial" : "Unpaid";
}

/** Mirrors `generateSupabaseBill` so the placeholder matches the saved row. */
export function buildOptimisticBillRow(payload: GenerateBillPayload): SheetRow {
  const ePrev = Number(payload.ePrev) || 0;
  const eCurr = Number(payload.eCurr) || 0;
  const eRate = Number(payload.eRate) || 14;
  const wPrev = Number(payload.wPrev) || 0;
  const wCurr = Number(payload.wCurr) || 0;
  const wRate = Number(payload.wRate) || 30;
  const rent = Number(payload.rent) || 0;
  const adjustment = Number(payload.adjustment) || 0;
  const elecBill = roundCurrency((eCurr - ePrev) * eRate);
  const waterBill = roundCurrency((wCurr - wPrev) * wRate);

  return {
    Month: billingDateToSheetMonth(sheetMonthToBillingDate(payload.month)),
    Room: Number(payload.room),
    Rent: rent,
    ElecPrev: ePrev,
    ElecCurr: eCurr,
    ElecRate: eRate,
    ElecBill: elecBill,
    WaterPrev: wPrev,
    WaterCurr: wCurr,
    WaterRate: wRate,
    WaterBill: waterBill,
    Adjustment: adjustment,
    TotalDue: roundCurrency(rent + elecBill + waterBill + adjustment),
    Paid: 0,
    DatePaid: null,
    BillingDate: payload.billingDate ?? null,
    DueDate: payload.dueDate ?? null,
    Notes: payload.notes?.trim() || null,
    Status: "Unpaid",
    PaymentActivities: [],
    Optimistic: true,
  };
}

export interface PaymentPreview {
  room: number;
  amount: number;
  /** Bills before this month (YYYY-MM) are skipped, like the server. */
  fromMonthKey: string;
  paymentDate: string;
  method: string;
  reference: string;
}

/**
 * Client copy of `apply_tenant_payment`: pays the room's unpaid bills
 * oldest-first and returns the amount left over for the tenant's credit.
 */
export function applyPaymentToRows(
  rows: SheetRow[],
  payment: PaymentPreview,
): { rows: SheetRow[]; leftover: number } {
  let remaining = roundCurrency(payment.amount);
  if (remaining <= 0) return { rows, leftover: 0 };

  const candidates = rows
    .map((row, index) => ({ row, index, key: billingMonthKey(String(row.Month)) }))
    .filter(
      ({ row, key }) =>
        Number(row.Room) === payment.room &&
        row.Status !== "Vacant" &&
        (!payment.fromMonthKey || key >= payment.fromMonthKey) &&
        rowTotalDue(row) - readSheetNumber(row.Paid) > 0,
    )
    .sort((a, b) => a.key.localeCompare(b.key));

  const next = [...rows];
  for (const { row, index } of candidates) {
    if (remaining <= 0) break;
    const totalDue = rowTotalDue(row);
    const paid = readSheetNumber(row.Paid);
    const applied = roundCurrency(Math.min(remaining, totalDue - paid));
    const newPaid = roundCurrency(paid + applied);

    next[index] = {
      ...row,
      Paid: newPaid,
      Status: paidStatus(totalDue, newPaid),
      DatePaid: payment.paymentDate,
      PaymentActivities: [
        ...(row.PaymentActivities ?? []),
        {
          id: `optimistic-${index}-${Date.now()}`,
          paymentDate: payment.paymentDate,
          amount: applied,
          method: payment.method,
          reference: payment.reference,
        },
      ],
    };
    remaining = roundCurrency(remaining - applied);
  }

  return { rows: next, leftover: remaining };
}

/** Pays what's left on `row` from `credit`; returns the amount used. */
export function applyCreditToRow(
  row: SheetRow,
  credit: number,
  paymentDate: string,
): { row: SheetRow; applied: number } {
  const totalDue = rowTotalDue(row);
  const paid = readSheetNumber(row.Paid);
  const applied = roundCurrency(Math.min(Math.max(0, credit), totalDue - paid));
  if (applied <= 0) return { row, applied: 0 };

  const newPaid = roundCurrency(paid + applied);
  return {
    row: {
      ...row,
      Paid: newPaid,
      Status: paidStatus(totalDue, newPaid),
      DatePaid: paymentDate,
      PaymentActivities: [
        ...(row.PaymentActivities ?? []),
        {
          id: `optimistic-credit-${Date.now()}`,
          paymentDate,
          amount: applied,
          method: "other",
          reference: "Credit from previous overpayment",
        },
      ],
    },
    applied,
  };
}

export function updateTenantInList(
  tenants: TenantRecord[],
  room: number,
  patch: Partial<TenantRecord>,
): TenantRecord[] {
  return tenants.map((tenant) =>
    Number(tenant.Room) === room ? { ...tenant, ...patch } : tenant,
  );
}
