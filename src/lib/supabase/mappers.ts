import type { ExpenseRecord } from "@/components/expenses/types";
import { billingMonthKey } from "@/lib/months";
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

export interface DbUtilityExpenseRow {
  billing_month: string;
  meralco_total_consumption_kwh: number;
  electricity_charge_rate: number;
  jjc_consumption_kwh: number;
  apartment_consumption_kwh: number;
  motor_consumption_kwh: number;
  electricity_motor_rate: number;
  meralco_bill_amount: number;
  meralco_paid_this_month: number;
  miwd_total_consumption_m3: number;
  water_charge_rate: number;
  miwd_residential_m3: number;
  miwd_commercial_m3: number;
  pumped_water_charge_m3: number;
  water_motor_rate: number;
  miwd_bill_amount: number;
  miwd_paid_this_month: number;
  miwd_special_rate: number;
}

/** Postgres date → Month string the UI expects (matches Google Sheets formats). */
export function billingDateToSheetMonth(billingMonth: string): string {
  const raw = billingMonth.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return billingMonth;

  const [yearStr, monthStr] = raw.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  // Always use calendar year/month from the date string (no UTC day-shift).
  return new Date(year, monthIndex, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Month string from the UI → Postgres date for storage / lookup. */
export function sheetMonthToBillingDate(month: string): string {
  const key = billingMonthKey(month);
  if (key) return `${key}-01`;
  return month;
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
    BillingId: row.id,
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

export function mapUtilityExpenseRow(
  row: DbUtilityExpenseRow,
  month: string,
): ExpenseRecord {
  return {
    billingMonth: month,
    meralcoTotalConsumptionKwh: Number(row.meralco_total_consumption_kwh) || 0,
    electricityChargeRate: Number(row.electricity_charge_rate) || 0,
    jjcConsumptionKwh: Number(row.jjc_consumption_kwh) || 0,
    apartmentConsumptionKwh: Number(row.apartment_consumption_kwh) || 0,
    motorConsumptionKwh: Number(row.motor_consumption_kwh) || 0,
    electricityMotorRate: Number(row.electricity_motor_rate) || 0,
    meralcoBillAmount: Number(row.meralco_bill_amount) || 0,
    meralcoPaidThisMonth: Number(row.meralco_paid_this_month) || 0,
    miwdTotalConsumptionM3: Number(row.miwd_total_consumption_m3) || 0,
    waterChargeRate: Number(row.water_charge_rate) || 0,
    miwdResidentialM3: Number(row.miwd_residential_m3) || 0,
    miwdCommercialM3: Number(row.miwd_commercial_m3) || 0,
    pumpedWaterChargeM3: Number(row.pumped_water_charge_m3) || 0,
    waterMotorRate: Number(row.water_motor_rate) || 0,
    miwdBillAmount: Number(row.miwd_bill_amount) || 0,
    miwdPaidThisMonth: Number(row.miwd_paid_this_month) || 0,
    miwdSpecialRate: Number(row.miwd_special_rate) || 30,
  };
}

export function utilityExpenseRecordToRow(
  record: ExpenseRecord,
): DbUtilityExpenseRow {
  return {
    billing_month: sheetMonthToBillingDate(record.billingMonth),
    meralco_total_consumption_kwh: record.meralcoTotalConsumptionKwh,
    electricity_charge_rate: record.electricityChargeRate,
    jjc_consumption_kwh: record.jjcConsumptionKwh,
    apartment_consumption_kwh: record.apartmentConsumptionKwh,
    motor_consumption_kwh: record.motorConsumptionKwh,
    electricity_motor_rate: record.electricityMotorRate,
    meralco_bill_amount: record.meralcoBillAmount,
    meralco_paid_this_month: record.meralcoPaidThisMonth,
    miwd_total_consumption_m3: record.miwdTotalConsumptionM3,
    water_charge_rate: record.waterChargeRate,
    miwd_residential_m3: record.miwdResidentialM3,
    miwd_commercial_m3: record.miwdCommercialM3,
    pumped_water_charge_m3: record.pumpedWaterChargeM3,
    water_motor_rate: record.waterMotorRate,
    miwd_bill_amount: record.miwdBillAmount,
    miwd_paid_this_month: record.miwdPaidThisMonth,
    miwd_special_rate: record.miwdSpecialRate,
  };
}

export function billingRowsMatchMonth(
  row: DbBillingRow,
  month: string,
): boolean {
  return billingMonthKey(billingDateToSheetMonth(row.billing_month)) === billingMonthKey(month);
}
