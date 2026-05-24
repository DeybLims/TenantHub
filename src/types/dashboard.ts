export interface DashboardKpis {
  revenue: number;
  utilityCharges: number;
  propertyExpenses: number;
  netIncome: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
}

export interface PaymentStatus {
  collected: number;
  outstanding: number;
}

export interface PropertyOccupancy {
  label: string;
  occupied: number;
  total: number;
}

export interface UtilityRow {
  utility: string;
  totalBill: number;
  allocatedAmount: number;
  remainingBalance: number;
  status: "Paid" | "Pending" | "Partial";
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  revenueTrend: RevenueTrendPoint[];
  paymentStatus: PaymentStatus;
  properties: PropertyOccupancy[];
  utilities: UtilityRow[];
  availableMonths: MonthOption[];
  activeMonth: string;
}
