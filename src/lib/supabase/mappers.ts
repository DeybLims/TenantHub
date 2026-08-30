import { billingMonthKey, isIsoMonth } from "@/lib/months";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export interface DbTenantRow {
  id: string;
  unit_code: string;
  room: number;
  name: string;
  contact_number: string;
  email_address: string;
  emergency_contact: string;
  emergency_number: string;
  lease_start: string | null;
  move_in: string | null;
  rent: number;
  deposit: number;
  notes: string;
  status: "Active" | "Vacant";
}

export interface DbBillingRow {
  id: string;
  billing_month: string;
  room: number;
  rent: number;
  elec_prev: number;
  elec_curr: number;
  elec_rate: number;
  elec_bill: number;
  water_prev: number;
  water_curr: number;
  water_rate: number;
  water_bill: number;
  adjustment: number;
  total_due: number;
  paid: number;
  date_paid: string | null;
  billing_date: string | null;
  due_date: string | null;
  notes: string;
  status: "Paid" | "Unpaid" | "Partial" | "Vacant";
}

/** Postgres date → Month string the UI expects (matches Google Sheets formats). */
export function billingDateToSheetMonth(billingMonth: string): string {
  const raw = billingMonth.slice(0, 10);
  const [, monthStr, dayStr] = raw.split("-");
  const day = Number(dayStr);
  const monthIndex = Number(monthStr) - 1;
  const year = Number(raw.slice(0, 4));

  if (day === 1) {
    return new Date(year, monthIndex, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  return `${raw}T16:00:00.000Z`;
}

/** Month string from the UI → Postgres date for storage / lookup. */
export function sheetMonthToBillingDate(month: string): string {
  const parsed = new Date(month);
  if (Number.isNaN(parsed.getTime())) {
    const key = billingMonthKey(month);
    if (!key) return month;
    return `${key}-01`;
  }

  const year = parsed.getFullYear();
  const monthIndex = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  if (isIsoMonth(month) && day !== "01") {
    return `${year}-${monthIndex}-${day}`;
  }

  return `${year}-${monthIndex}-01`;
}

export function mapTenantRow(row: DbTenantRow): TenantRecord {
  return {
    UnitCode: row.unit_code,
    Room: row.room,
    Name: row.name,
    ContactNumber: row.contact_number ?? "",
    EmailAddress: row.email_address ?? "",
    EmergencyContact: row.emergency_contact ?? "",
    EmergencyNumber: row.emergency_number ?? "",
    LeaseStart: row.lease_start ?? "",
    MoveIn: row.move_in ?? "",
    Rent: Number(row.rent) || 0,
    Deposit: Number(row.deposit) || 0,
    Notes: row.notes ?? "",
    Status: row.status,
  };
}

export function mapBillingRow(row: DbBillingRow): SheetRow {
  return {
    Month: billingDateToSheetMonth(row.billing_month),
    Room: row.room,
    Rent: row.rent,
    ElecPrev: row.elec_prev,
    ElecCurr: row.elec_curr,
    ElecRate: row.elec_rate,
    ElecBill: row.elec_bill,
    WaterPrev: row.water_prev,
    WaterCurr: row.water_curr,
    WaterRate: row.water_rate,
    WaterBill: row.water_bill,
    Adjustment: row.adjustment,
    TotalDue: row.total_due,
    Paid: row.paid,
    DatePaid: row.date_paid,
    BillingDate: row.billing_date,
    DueDate: row.due_date,
    Notes: row.notes || null,
    Status: row.status,
  };
}

export function billingRowsMatchMonth(
  row: DbBillingRow,
  month: string,
): boolean {
  return billingMonthKey(billingDateToSheetMonth(row.billing_month)) === billingMonthKey(month);
}
