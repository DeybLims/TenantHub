export type BillPaymentStatus = "Paid" | "Unpaid" | "Partial";

export type BillPaymentMethod = "cash" | "bank" | "online" | "other";

export interface PaymentActivity {
  id: string;
  paymentDate: string;
  amount: number;
  method: BillPaymentMethod;
  reference: string;
}

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
  datePaid?: string | null;
  notes?: string;
  /** Individual Pay Balance transactions (date + method + amount + reference). */
  paymentActivities?: PaymentActivity[];
}

export interface BillingPeriodSummary {
  amountDue: number;
  paid: number;
  balance: number;
  status: BillPaymentStatus;
}

/** Tenant-scoped billing summary for preview / export views. */
export interface TenantBillingSummary extends BillingPeriodSummary {
  tenantName: string;
  unitCode: string;
  room: number;
  statementPeriod: string;
  bills: Bill[];
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
  /** YYYY-MM-DD */
  billingDate?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  /** Paid when the bill is created; any excess over Total Due becomes tenant credit. */
  paid?: number;
  notes?: string;
  /**
   * YYYY-MM-DD. Required when billing a month before the tenant's move-in —
   * the tenant's move-in is moved back to this date so the bill stays visible.
   */
  moveInDate?: string;
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
  datePaid?: string;
  notes?: string;
  /** When set, records one payment activity row (timestamp + reference). */
  paymentActivity?: {
    amount: number;
    method: BillPaymentMethod;
    reference?: string;
    paymentDate: string;
  };
  /** Overpayment beyond every unpaid bill, added to the tenant's credit balance. */
  creditToTenant?: number;
}

/** The step of a multi-step billing operation that failed. */
export type BillingStep =
  | "validate"
  | "create_bill"
  | "update_bill"
  | "sync_meter_readings"
  | "record_payment"
  | "apply_credit";

export interface BillingActionResult {
  success: boolean;
  message: string;
  /** Set when `success` is false and a specific step failed. */
  step?: BillingStep;
  /**
   * True when part of the operation was saved before the failure (the
   * change could not be undone), so the client must not roll back.
   */
  committed?: boolean;
}

/** One payment applied atomically to a room's unpaid bills, oldest first. */
export interface PayBalancePayload {
  room: number;
  amount: number;
  /** YYYY-MM-DD on the Manila calendar. */
  paymentDate: string;
  method: BillPaymentMethod;
  reference?: string;
}

export interface PayBalanceResult extends BillingActionResult {
  /** Amount carried to the tenant's credit after every bill was paid. */
  creditAdded?: number;
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
