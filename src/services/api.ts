import {
  isSheetRowArray,
  transformSheetToDashboard,
} from "@/lib/transformSheetData";
import type { DashboardData } from "@/types/dashboard";

export const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbzoFuKibrampjbSPTIUncR4Uwq26G_1z9Xd5UgEtXPAmffu446BMM_U5MCouFna5keA/exec";

/** Fetches billing data for the dashboard, optionally filtered by month. */
export async function fetchBilling(month?: string): Promise<DashboardData> {
  const params = new URLSearchParams({ action: "getBilling" });
  if (month) {
    params.set("month", month);
  }

  const response = await fetch(`/api/dashboard?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ??
        `Failed to fetch billing data: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();
  return normalizeDashboardData(data, month);
}

/** @deprecated Use fetchBilling */
export const fetchDashboardData = fetchBilling;

function normalizeDashboardData(
  data: unknown,
  month?: string,
): DashboardData {
  if (isSheetRowArray(data)) {
    return transformSheetToDashboard(data, month);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid dashboard response: expected JSON array or object");
  }

  const payload = data as Record<string, unknown>;

  if (Array.isArray(payload.data) && isSheetRowArray(payload.data)) {
    return transformSheetToDashboard(payload.data, month);
  }

  const kpis = (payload.kpis as Record<string, unknown> | undefined) ?? payload;
  const payment =
    (payload.paymentStatus as Record<string, unknown> | undefined) ?? payload;

  return {
    kpis: {
      revenue: readNumber(kpis, "revenue", "totalRent"),
      utilityCharges: readNumber(kpis, "utilityCharges", "utilityCollected"),
      propertyExpenses: readNumber(kpis, "propertyExpenses", "totalExpenses"),
      netIncome: readNumber(kpis, "netIncome", "netProfit"),
    },
    revenueTrend: Array.isArray(payload.revenueTrend)
      ? (
          payload.revenueTrend as { month?: string; revenue?: number }[]
        ).map((point) => ({
          month: String(point.month ?? ""),
          revenue: Number(point.revenue ?? 0),
        }))
      : [],
    paymentStatus: {
      collected: readNumber(payment, "collected"),
      outstanding: readNumber(payment, "outstanding"),
    },
    properties: Array.isArray(payload.properties)
      ? (payload.properties as DashboardData["properties"])
      : [],
    utilities: Array.isArray(payload.utilities)
      ? (
          payload.utilities as {
            utility?: string;
            totalBill?: number;
            allocatedAmount?: number;
            remainingBalance?: number;
            status?: string;
          }[]
        ).map((row) => ({
          utility: String(row.utility ?? ""),
          totalBill: Number(row.totalBill ?? 0),
          allocatedAmount: Number(row.allocatedAmount ?? 0),
          remainingBalance: Number(row.remainingBalance ?? 0),
          status: parseStatus(row.status),
        }))
      : [],
    availableMonths: Array.isArray(payload.availableMonths)
      ? (payload.availableMonths as DashboardData["availableMonths"])
      : [],
    activeMonth: String(payload.activeMonth ?? month ?? ""),
  };
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  fallbackKey?: string,
): number {
  const value = source[key] ?? (fallbackKey ? source[fallbackKey] : undefined);
  return value != null ? Number(value) : 0;
}

function parseStatus(value: unknown): "Paid" | "Pending" | "Partial" {
  const status = String(value ?? "Pending").toLowerCase();
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "Pending";
}

export function getMockDashboardData(): DashboardData {
  return {
    kpis: {
      revenue: 75980,
      utilityCharges: 5160,
      propertyExpenses: 0,
      netIncome: 59980,
    },
    revenueTrend: [
      { month: "Jan", revenue: 52000 },
      { month: "Feb", revenue: 61000 },
      { month: "Mar", revenue: 58000 },
      { month: "Apr", revenue: 67000 },
      { month: "May", revenue: 72000 },
      { month: "Jun", revenue: 75980 },
    ],
    paymentStatus: { collected: 29834, outstanding: 13928 },
    properties: [
      { label: "Apartment", occupied: 5, total: 6 },
      { label: "Commercial", occupied: 1, total: 2 },
    ],
    utilities: [
      {
        utility: "Electricity",
        totalBill: 7900,
        allocatedAmount: 7900,
        remainingBalance: 0,
        status: "Paid",
      },
      {
        utility: "Water",
        totalBill: 1300,
        allocatedAmount: 1300,
        remainingBalance: 0,
        status: "Pending",
      },
    ],
    availableMonths: [
      { value: "2026-03-31T16:00:00.000Z", label: "March 2026" },
      { value: "2026-02-28T16:00:00.000Z", label: "February 2026" },
    ],
    activeMonth: "2026-03-31T16:00:00.000Z",
  };
}
