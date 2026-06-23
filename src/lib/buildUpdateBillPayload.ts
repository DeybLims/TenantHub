import { readSheetNumber } from "@/lib/readSheetNumber";
import {
  DEFAULT_ELECTRICITY_RATE,
  type BillingDetailSaveData,
  type UpdateBillPayload,
} from "@/types/billing";

function deriveRate(bill: number, prev: number, curr: number, fallback: number) {
  const usage = Math.max(0, curr - prev);
  if (usage <= 0) return fallback;
  return bill / usage;
}

export function buildUpdateBillPayload(
  month: string,
  room: number,
  data: BillingDetailSaveData,
): UpdateBillPayload {
  const ePrev = readSheetNumber(data.elecPrev);
  const eCurr = readSheetNumber(data.elecCurr);
  const wPrev = readSheetNumber(data.waterPrev);
  const wCurr = readSheetNumber(data.waterCurr);
  const eBill = readSheetNumber(data.elecBill);
  const wBill = readSheetNumber(data.waterBill);

  return {
    month,
    room: String(room),
    rent: readSheetNumber(data.baseRent),
    ePrev,
    eCurr,
    eRate: deriveRate(eBill, ePrev, eCurr, DEFAULT_ELECTRICITY_RATE),
    eBill,
    wPrev,
    wCurr,
    wRate: deriveRate(wBill, wPrev, wCurr, 30),
    wBill,
    adjustment: readSheetNumber(data.otherCharges),
    totalDue: readSheetNumber(data.totalDue),
    paid: readSheetNumber(data.amountPaid),
    status: data.status,
    billingDate: data.billingDate || undefined,
    dueDate: data.dueDate || undefined,
    notes: data.notes || undefined,
  };
}
