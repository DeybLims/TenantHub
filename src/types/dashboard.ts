export interface DashboardKpis {
  utilityCharges: number;
  tenantCollections: number;
  outstandingBalance: number;
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
  actualCost: number;
  tenantPaid: number;
  profitLoss: number;
}

export interface UtilityUsagePoint {
  label: string;
  value: number;
}

export interface UtilityUsageSeries {
  monthly: UtilityUsagePoint[];
  yearly: UtilityUsagePoint[];
}

export interface RecentActivityItem {
  id: string;
  tenantName: string;
  unitCode: string;
  amount: number;
  date: string;
  type: "payment" | "bill";
}

export interface MonthOption {
  value: string;
  label: string;
}

import type { SheetRow } from "@/types/sheet";

export interface DashboardData {
  kpis: DashboardKpis;
  revenueTrend: RevenueTrendPoint[];
  paymentStatus: PaymentStatus;
  properties: PropertyOccupancy[];
  utilities: UtilityRow[];
  electricityUsage: UtilityUsageSeries;
  waterUsage: UtilityUsageSeries;
  recentActivity: RecentActivityItem[];
  /** Tenant rows for the selected month — used for CSV export. */
  reportSheetRows: SheetRow[];
  availableMonths: MonthOption[];
  activeMonth: string;
}
