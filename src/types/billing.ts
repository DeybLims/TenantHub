export type BillPaymentStatus = "Paid" | "Unpaid" | "Partial";

export interface UtilityReading {
  amount: number;
  previous: number;
  current: number;
  specialRate?: boolean;
}

export interface Bill {
  id: string;
  room: number;
  unitCode: string;
  tenantName: string;
  billingPeriod: string;
  billingMonth: string;
  billingDate: string;
  dueDate: string;
  baseRent: number;
  electricity: UtilityReading;
  water: UtilityReading;
  otherCharges: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  status: BillPaymentStatus;
  notes?: string;
}

export interface BillingPeriodSummary {
  amountDue: number;
  paid: number;
  balance: number;
  status: BillPaymentStatus;
}

export interface BillingDashboardSummary {
  totalCollected: number;
  paymentCount: number;
  outstandingBalance: number;
  tenantsWithBalance: number;
  overdueAccounts: number;
}

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

export interface UpdateBillPayload {
  month: string;
  room: string;
  rent: number;
  ePrev: number;
  eCurr: number;
  eRate: number;
  eBill: number;
  wPrev: number;
  wCurr: number;
  wRate: number;
  wBill: number;
  adjustment: number;
  totalDue: number;
  paid: number;
  status: string;
  billingDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface BillingDetailSaveData {
  status: string;
  billingDate: string;
  dueDate: string;
  baseRent: string;
  elecBill: string;
  elecPrev: string;
  elecCurr: string;
  waterBill: string;
  waterPrev: string;
  waterCurr: string;
  otherCharges: string;
  totalDue: string;
  amountPaid: string;
  notes: string;
}

export const WATER_RATE_OPTIONS = [
  { value: 30, label: "₱30.00 (Standard)" },
  { value: 45, label: "₱45.00 (Special)" },
] as const;

export const DEFAULT_ELECTRICITY_RATE = 14;
