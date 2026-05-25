import {
  getMockTenants,
  normalizeTenants,
} from "@/lib/normalizeTenants";
import {
  isSheetRowArray,
  transformSheetToDashboard,
} from "@/lib/transformSheetData";
import type { DashboardData } from "@/types/dashboard";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbz17asvx2Gnydy5pP3POrG72pI7lmPRoyvLrLoRxdE-sK6pMFEcu4bEV96IehqR3MEu/exec";

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

/** Fetches raw billing rows for tenant payment status joins. */
export async function fetchBillingRows(month?: string): Promise<SheetRow[]> {
  if (USE_MOCK) {
    return getMockBillingRows();
  }

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
        `Failed to fetch billing rows: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (isSheetRowArray(data)) {
    return data;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    isSheetRowArray((data as { data: unknown }).data)
  ) {
    return (data as { data: SheetRow[] }).data;
  }

  throw new Error("Invalid billing response: expected a JSON array of rows");
}

export function getMockBillingRows(): SheetRow[] {
  return getMockDashboardData().reportSheetRows;
}

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

/** Fetches tenant records from the Sheets API. */
export async function fetchTenants(): Promise<TenantRecord[]> {
  if (USE_MOCK) {
    return getMockTenants();
  }

  const response = await fetch("/api/tenants", {
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
        `Failed to fetch tenants: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();
  const tenants = normalizeTenants(data);

  if (tenants.length === 0) {
    return getMockTenants();
  }

  return tenants;
}

export { getMockTenants };

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
    reportSheetRows: [],
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
    reportSheetRows: [
      {
        Month: "2026-03-31T16:00:00.000Z",
        Room: 1,
        Rent: 10000,
        ElecPrev: 6834,
        ElecCurr: 7010,
        ElecRate: 14,
        ElecBill: 2464,
        WaterPrev: 1076,
        WaterCurr: 1091,
        WaterRate: 30,
        WaterBill: 450,
        Adjustment: 0,
        TotalDue: 12914,
        Paid: 0,
        DatePaid: null,
        Status: "Unpaid",
      },
      {
        Month: "2026-03-31T16:00:00.000Z",
        Room: 3,
        Rent: 8000,
        ElecPrev: 4052,
        ElecCurr: 4126,
        ElecRate: 14,
        ElecBill: 1036,
        WaterPrev: 199,
        WaterCurr: 202,
        WaterRate: 30,
        WaterBill: 90,
        Adjustment: 0,
        TotalDue: 9126,
        Paid: 9126,
        DatePaid: "2026-03-15T00:00:00.000Z",
        Status: "Paid",
      },
    ],
    availableMonths: [
      { value: "2026-03-31T16:00:00.000Z", label: "March 2026" },
      { value: "2026-02-28T16:00:00.000Z", label: "February 2026" },
    ],
    activeMonth: "2026-03-31T16:00:00.000Z",
  };
}
