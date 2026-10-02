import {
  calcConsumption,
  isCorrectionMonth,
  roundCurrency,
} from "@/lib/propertyBillingCalculations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { billingDateToSheetMonth, type DbBillingRow } from "@/lib/supabase/mappers";

/**
 * Meter readings chain month to month per room: each bill's "previous" must
 * equal the prior bill's "current". The chain follows the physical meter, so
 * it spans occupants — a new tenant's first bill continues the last one.
 * A current reading of 0 means no reading was entered; that utility is left
 * out of the chain.
 */
export interface CurrentReadings {
  elecCurr: number;
  waterCurr: number;
}

export type ChainedFields = Pick<
  DbBillingRow,
  "elec_prev" | "water_prev" | "elec_bill" | "water_bill" | "total_due" | "status"
>;

export function billMonthLabel(bill: Pick<DbBillingRow, "billing_month">): string {
  return billingDateToSheetMonth(bill.billing_month);
}

function chainsElectricity(next: DbBillingRow): boolean {
  return Number(next.elec_curr) > 0;
}

function chainsWater(next: DbBillingRow): boolean {
  return Number(next.water_curr) > 0;
}

/** The room's next chargeable bill with readings after `billingMonth` (YYYY-MM-01). */
export async function findNextBill(
  room: number,
  billingMonth: string,
): Promise<DbBillingRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("billing_records")
    .select("*")
    .eq("room", room)
    .gt("billing_month", billingMonth)
    .neq("status", "Vacant")
    .or("elec_curr.gt.0,water_curr.gt.0")
    .order("billing_month", { ascending: true })
    .limit(1)
    .maybeSingle<DbBillingRow>();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Why `readings` can't become `next`'s previous readings, or null when they
 * can. A lower later reading is only allowed in correction months.
 */
export function describeChainConflict(
  next: DbBillingRow,
  readings: CurrentReadings,
): string | null {
  if (isCorrectionMonth(next.billing_month)) return null;

  const label = billMonthLabel(next);
  const conflicts: string[] = [];
  if (chainsElectricity(next) && Number(next.elec_curr) < readings.elecCurr) {
    conflicts.push(
      `electricity ${readings.elecCurr} is higher than ${label}'s ${Number(next.elec_curr)}`,
    );
  }
  if (chainsWater(next) && Number(next.water_curr) < readings.waterCurr) {
    conflicts.push(
      `water ${readings.waterCurr} is higher than ${label}'s ${Number(next.water_curr)}`,
    );
  }
  if (conflicts.length === 0) return null;

  return `Check the current readings: ${conflicts.join(", and ")}. Meter readings can't go down from one month to the next (except in the May correction month).`;
}

function chainedStatus(
  current: DbBillingRow["status"],
  totalDue: number,
  paid: number,
): DbBillingRow["status"] {
  if (current === "Vacant") return current;
  if (paid <= 0 && totalDue > 0) return "Unpaid";
  return paid >= totalDue ? "Paid" : "Partial";
}

/** `next` re-priced with `readings` as its previous readings. */
export function chainedFields(next: DbBillingRow, readings: CurrentReadings): ChainedFields {
  const allowNegative = isCorrectionMonth(next.billing_month);
  const elecPrev = chainsElectricity(next) ? readings.elecCurr : Number(next.elec_prev);
  const waterPrev = chainsWater(next) ? readings.waterCurr : Number(next.water_prev);
  const elecBill = chainsElectricity(next)
    ? roundCurrency(
        calcConsumption(elecPrev, Number(next.elec_curr), allowNegative) *
          Number(next.elec_rate),
      )
    : Number(next.elec_bill);
  const waterBill = chainsWater(next)
    ? roundCurrency(
        calcConsumption(waterPrev, Number(next.water_curr), allowNegative) *
          Number(next.water_rate),
      )
    : Number(next.water_bill);
  const totalDue = roundCurrency(
    Number(next.rent) + elecBill + waterBill + Number(next.adjustment),
  );

  return {
    elec_prev: elecPrev,
    water_prev: waterPrev,
    elec_bill: elecBill,
    water_bill: waterBill,
    total_due: totalDue,
    status: chainedStatus(next.status, totalDue, Number(next.paid) || 0),
  };
}

/**
 * Points `next`'s previous readings at `readings` and re-prices it.
 * Returns the fields needed to undo the change, or null when nothing changed.
 */
export async function syncNextBillReadings(
  next: DbBillingRow,
  readings: CurrentReadings,
): Promise<ChainedFields | null> {
  const fields = chainedFields(next, readings);
  if (
    fields.elec_prev === Number(next.elec_prev) &&
    fields.water_prev === Number(next.water_prev)
  ) {
    return null;
  }

  const { error } = await getSupabaseAdmin()
    .from("billing_records")
    .update(fields)
    .eq("id", next.id);
  if (error) throw new Error(error.message);

  return {
    elec_prev: next.elec_prev,
    water_prev: next.water_prev,
    elec_bill: next.elec_bill,
    water_bill: next.water_bill,
    total_due: next.total_due,
    status: next.status,
  };
}

/** Restores `next` to the values returned by `syncNextBillReadings`. */
export async function restoreNextBillReadings(
  nextId: string,
  previous: ChainedFields,
): Promise<boolean> {
  const { error } = await getSupabaseAdmin()
    .from("billing_records")
    .update(previous)
    .eq("id", nextId);
  return !error;
}
