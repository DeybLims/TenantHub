export interface BillingTableRow {
  room: number;
  unitCode: string;
  tenantName: string;
  rent: number;
  elecBill: number;
  elecPrev: number;
  elecCurr: number;
  waterBill: number;
  waterPrev: number;
  waterCurr: number;
  otherCharges: number;
  totalDue: number;
  paid: number;
  balance: number;
  status: string;
  month: string;
}

export interface GenerateBillPayload {
  month: string;
  room: string;
  rent: number;
  ePrev: number;
  eCurr: number;
  eRate: number;
  wPrev: number;
  wCurr: number;
  wRate: number;
  adjustment: number;
}

export const WATER_RATE_OPTIONS = [
  { value: 30, label: "₱30.00 (Standard)" },
  { value: 45, label: "₱45.00 (Special)" },
] as const;

export const DEFAULT_ELECTRICITY_RATE = 14;
