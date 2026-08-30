import type {
  DashboardData,
  PropertyOccupancy,
  RecentActivityItem,
  UtilityRow,
  UtilityUsageSeries,
} from "@/types/dashboard";
import type { SheetRow } from "@/types/sheet";
import {
  MONTH_NAMES,
  formatMonthLabel,
  isIsoMonth,
  monthChartLabel,
  sortMonths,
} from "@/lib/months";

function toNumber(value: number | string | undefined | null): number {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isTenantRoom(room: number | string): room is number {
  return typeof room === "number" && room >= 1 && room <= 8;
}

function rowTotalDue(row: SheetRow): number {
  return toNumber(row.TotalDue ?? row.Total);
}

function rowPaid(row: SheetRow): number {
  return toNumber(row.Paid);
}

function allocatedUtility(row: SheetRow, bill: number): number {
  const due = rowTotalDue(row);
  if (due <= 0 || bill <= 0) return 0;
  if (row.Status === "Paid") return bill;
  if (row.Status === "Partial") {
    return Math.min(bill, (rowPaid(row) / due) * bill);
  }
  return 0;
}

function isLegacySheet(rows: SheetRow[]): boolean {
  return rows.some(
    (r) =>
      typeof r.Room === "string" &&
      ["APT TENANTS", "NET", "Meralco"].includes(String(r.Room)),
  );
}

function tenantRows(rows: SheetRow[]): SheetRow[] {
  return rows.filter((r) => isTenantRoom(r.Room));
}

function findRow(rows: SheetRow[], room: string): SheetRow | undefined {
  return rows.find((r) => String(r.Room) === room);
}

function findMeterRow(rows: SheetRow[]): SheetRow | undefined {
  return rows.find((r) => String(r.Room).includes("T") && !isIsoMonth(r.Month));
}

function buildUtilityRow(
  utility: string,
  actualCost: number,
  tenantPaid: number,
): UtilityRow {
  return {
    utility,
    actualCost,
    tenantPaid,
    profitLoss: roundCurrency(tenantPaid - actualCost),
  };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildUsageSeries(
  rows: SheetRow[],
  utility: "electricity" | "water",
): UtilityUsageSeries {
  const tenantMonthRows = rows.filter((row) => isTenantRoom(row.Room));
  const monthMap = new Map<string, number>();

  for (const row of tenantMonthRows) {
    const monthKey = String(row.Month);
    const value =
      utility === "electricity"
        ? toNumber(row.ElecBill)
        : toNumber(row.WaterBill);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + value);
  }

  const sortedMonths = sortMonths([...monthMap.keys()]);
  const monthly = sortedMonths.slice(-6).map((monthKey) => ({
    label: monthChartLabel(monthKey),
    value: monthMap.get(monthKey) ?? 0,
  }));

  const yearMap = new Map<number, number>();
  for (const [monthKey, value] of monthMap.entries()) {
    const year = new Date(monthKey).getFullYear();
    if (!Number.isNaN(year)) {
      yearMap.set(year, (yearMap.get(year) ?? 0) + value);
    }
  }

  const yearly = [...yearMap.entries()]
    .sort(([a], [b]) => a - b)
    .slice(-4)
    .map(([year, value]) => ({
      label: String(year),
      value,
    }));

  return { monthly, yearly };
}

function buildRecentActivity(rows: SheetRow[]): RecentActivityItem[] {
  const tenantRowsList = tenantRows(rows);
  const items: RecentActivityItem[] = [];

  for (const row of tenantRowsList) {
    const paid = rowPaid(row);
    const due = rowTotalDue(row);
    const room = Number(row.Room);
    const unitCode = room <= 6 ? `APT-${100 + room}` : `COM-${200 + room - 6}`;
    const tenantName = `Room ${room}`;

    if (paid > 0 && row.DatePaid) {
      items.push({
        id: `pay-${room}-${row.Month}`,
        tenantName: String((row as SheetRow & { TenantName?: string }).TenantName ?? tenantName),
        unitCode,
        amount: paid,
        date: String(row.DatePaid),
        type: "payment",
      });
    } else if (due > 0) {
      items.push({
        id: `bill-${room}-${row.Month}`,
        tenantName: String((row as SheetRow & { TenantName?: string }).TenantName ?? tenantName),
        unitCode,
        amount: due,
        date: String(row.Month),
        type: "bill",
      });
    }
  }

  return items
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 8);
}

/** Apartment units 1–6; commercial units 7–8 (adjust if your sheet differs). */
const APARTMENT_ROOMS = [1, 2, 3, 4, 5, 6] as const;
const COMMERCIAL_ROOMS = [7, 8] as const;

function isRoomOccupied(row: SheetRow | undefined): boolean {
  if (!row) return false;

  const status = String(row.Status ?? "")
    .trim()
    .toLowerCase();

  if (status === "vacant") return false;

  // Any billing row for the month with an active tenancy status counts as occupied.
  if (status === "paid" || status === "partial" || status === "unpaid") {
    return true;
  }

  return toNumber(row.Rent) > 0 || rowTotalDue(row) > 0;
}

function countOccupied(
  tenants: SheetRow[],
  roomNumbers: readonly number[],
): PropertyOccupancy {
  const occupied = roomNumbers.filter((room) =>
    isRoomOccupied(tenants.find((t) => t.Room === room)),
  ).length;

  return {
    label: roomNumbers[0] <= 6 ? "Apartment" : "Commercial",
    occupied,
    total: roomNumbers.length,
  };
}

/** Occupancy is derived from each month's tenant billing rows returned by the API. */
export function buildProperties(tenants: SheetRow[]): PropertyOccupancy[] {
  return [
    countOccupied(tenants, APARTMENT_ROOMS),
    countOccupied(tenants, COMMERCIAL_ROOMS),
  ];
}

function buildTenantMonthDashboard(rows: SheetRow[]): Omit<
  DashboardData,
  "revenueTrend" | "reportSheetRows" | "availableMonths" | "activeMonth"
> {
  const tenants = tenantRows(rows);
  const paidBill = tenants.reduce((sum, r) => sum + rowPaid(r), 0);

  const collected = paidBill;
  const outstanding = tenants.reduce(
    (sum, r) => sum + Math.max(0, rowTotalDue(r) - rowPaid(r)),
    0,
  );

  const electricityActual = tenants.reduce(
    (sum, r) => sum + toNumber(r.ElecBill),
    0,
  );
  const electricityTenantPaid = tenants.reduce(
    (sum, r) => sum + allocatedUtility(r, toNumber(r.ElecBill)),
    0,
  );
  const waterActual = tenants.reduce((sum, r) => sum + toNumber(r.WaterBill), 0);
  const waterTenantPaid = tenants.reduce(
    (sum, r) => sum + allocatedUtility(r, toNumber(r.WaterBill)),
    0,
  );

  const utilities: UtilityRow[] = [
    buildUtilityRow("Electricity", electricityActual, electricityTenantPaid),
    buildUtilityRow("Water", waterActual, waterTenantPaid),
  ];

  const utilityCharges = utilities.reduce((sum, row) => sum + row.actualCost, 0);
  const tenantCollections = utilities.reduce((sum, row) => sum + row.tenantPaid, 0);
  const netIncome = utilities.reduce((sum, row) => sum + row.profitLoss, 0);

  return {
    kpis: {
      utilityCharges,
      tenantCollections,
      outstandingBalance: outstanding,
      netIncome,
    },
    paymentStatus: { collected, outstanding },
    properties: buildProperties(tenants),
    utilities,
    electricityUsage: buildUsageSeries(rows, "electricity"),
    waterUsage: buildUsageSeries(rows, "water"),
    recentActivity: buildRecentActivity(rows),
  };
}

function buildLegacyMonthDashboard(rows: SheetRow[]): Omit<
  DashboardData,
  "revenueTrend" | "reportSheetRows" | "availableMonths" | "activeMonth"
> {
  const tenants = tenantRows(rows);
  const aptTenants = findRow(rows, "APT TENANTS");
  const netRow = findRow(rows, "NET");
  const meterRow = findMeterRow(rows);
  const motorConsumption = findRow(rows, "APT MOTOR CONSUMPTION");

  const totalBill = tenants.reduce((sum, r) => sum + rowTotalDue(r), 0);
  const paidBill = tenants.reduce((sum, r) => sum + rowPaid(r), 0);

  const collected = paidBill;
  const outstanding = tenants.reduce(
    (sum, r) => sum + Math.max(0, rowTotalDue(r) - rowPaid(r)),
    0,
  );

  const electricityActual = toNumber(meterRow?.ElecBill);
  const electricityTenantPaid = toNumber(aptTenants?.ElecBill);
  const waterActual = Math.abs(toNumber(motorConsumption?.WaterPrev));
  const waterTenantPaid = toNumber(aptTenants?.WaterPrev);

  const utilities: UtilityRow[] = [
    buildUtilityRow("Electricity", electricityActual, electricityTenantPaid),
    buildUtilityRow("Water", waterActual, waterTenantPaid),
  ];

  const utilityCharges = utilities.reduce((sum, row) => sum + row.actualCost, 0);
  const tenantCollections = utilities.reduce((sum, row) => sum + row.tenantPaid, 0);
  const netIncome =
    toNumber(netRow?.ElecBill) ||
    utilities.reduce((sum, row) => sum + row.profitLoss, 0);

  return {
    kpis: {
      utilityCharges,
      tenantCollections,
      outstandingBalance: outstanding,
      netIncome,
    },
    paymentStatus: { collected, outstanding },
    properties: buildProperties(tenants),
    utilities,
    electricityUsage: buildUsageSeries(rows, "electricity"),
    waterUsage: buildUsageSeries(rows, "water"),
    recentActivity: buildRecentActivity(rows),
  };
}

function buildMonthDashboard(rows: SheetRow[]) {
  return isLegacySheet(rows)
    ? buildLegacyMonthDashboard(rows)
    : buildTenantMonthDashboard(rows);
}

function resolveMonth(rows: SheetRow[], month?: string): string {
  if (month && rows.some((r) => r.Month === month && isTenantRoom(r.Room))) {
    return month;
  }
  return getDefaultMonth(rows);
}

export function getDefaultMonth(rows: SheetRow[]): string {
  if (isLegacySheet(rows)) {
    const current = MONTH_NAMES[new Date().getMonth()];
    if (rows.some((r) => r.Month === current && isTenantRoom(r.Room))) {
      return current;
    }
    for (let i = MONTH_NAMES.length - 1; i >= 0; i--) {
      const name = MONTH_NAMES[i];
      if (rows.some((r) => r.Month === name && isTenantRoom(r.Room))) {
        return name;
      }
    }
    return rows[0]?.Month ?? "January";
  }

  const tenantMonths = sortMonths([
    ...new Set(rows.filter((r) => isTenantRoom(r.Room)).map((r) => r.Month)),
  ]);

  if (tenantMonths.length === 0) {
    return rows[0]?.Month ?? "";
  }

  const now = new Date();
  const match = tenantMonths.find((m) => {
    const d = new Date(m);
    return (
      d.getUTCFullYear() === now.getFullYear() &&
      d.getUTCMonth() === now.getUTCMonth()
    );
  });

  return match ?? tenantMonths[tenantMonths.length - 1];
}

export function getAvailableMonths(rows: SheetRow[]) {
  const legacy = isLegacySheet(rows);
  const months = legacy
    ? MONTH_NAMES.filter((name) =>
        rows.some(
          (r) =>
            r.Month === name && isTenantRoom(r.Room) && rowTotalDue(r) > 0,
        ),
      )
    : [
        ...new Set(
          rows.filter((r) => isTenantRoom(r.Room)).map((r) => r.Month),
        ),
      ];

  return sortMonths(months).map((value) => ({
    value,
    label: formatMonthLabel(value),
  }));
}

export function transformSheetToDashboard(
  rows: SheetRow[],
  month?: string,
): DashboardData {
  const activeMonth = resolveMonth(rows, month);
  const monthRows = rows.filter((r) => r.Month === activeMonth);
  const dashboard = buildMonthDashboard(monthRows);
  const legacy = isLegacySheet(rows);

  const trendMonths = legacy
    ? MONTH_NAMES.filter((name) =>
        rows.some(
          (r) =>
            r.Month === name && isTenantRoom(r.Room) && rowTotalDue(r) > 0,
        ),
      )
    : [
        ...new Set(
          rows.filter((r) => isTenantRoom(r.Room)).map((r) => r.Month),
        ),
      ];

  const revenueTrend = sortMonths(trendMonths).map((monthKey) => {
    const monthTenants = rows.filter(
      (r) => r.Month === monthKey && isTenantRoom(r.Room),
    );
    const revenue = monthTenants
      .filter((r) => r.Status !== "Vacant")
      .reduce((sum, r) => sum + rowTotalDue(r), 0);

    return { month: monthChartLabel(monthKey), revenue };
  });

  return {
    ...dashboard,
    revenueTrend,
    reportSheetRows: tenantRows(monthRows),
    availableMonths: getAvailableMonths(rows),
    activeMonth,
  };
}

export function isSheetRowArray(data: unknown): data is SheetRow[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    "Month" in data[0]
  );
}
