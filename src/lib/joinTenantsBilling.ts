import { billingMonthsMatch, formatMonthLabel, sortMonths } from "@/lib/months";
import { buildTenantBillingSummary } from "@/lib/tenantBillingSummary";
import { buildTenantRowsForMonth } from "@/lib/tenantRooms";
import type { MonthOption } from "@/types/dashboard";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export type TenantDisplayStatus =
  | "Vacant"
  | "Paid"
  | "Unpaid"
  | "Partial"
  | "No Bill";

export interface TenantTableRow extends TenantRecord {
  displayStatus: TenantDisplayStatus;
}

function normalizeOverallStatus(status: string): TenantDisplayStatus {
  const value = status.trim().toLowerCase();
  if (value === "paid") return "Paid";
  if (value === "unpaid") return "Unpaid";
  if (value === "partial") return "Partial";
  if (value === "no bill") return "No Bill";
  return "No Bill";
}

export function resolveTenantDisplayStatus(
  tenant: TenantRecord,
  billingRows: SheetRow[],
): TenantDisplayStatus {
  if (tenant.Status === "Vacant") {
    return "Vacant";
  }

  const summary = buildTenantBillingSummary(billingRows, tenant.Room, tenant);
  return normalizeOverallStatus(summary.status);
}

export function joinTenantsWithBilling(
  tenants: TenantRecord[],
  billing: SheetRow[],
  selectedMonth: string,
): TenantTableRow[] {
  const roomTenants = buildTenantRowsForMonth(tenants, selectedMonth);

  return roomTenants.map((tenant) => ({
    ...tenant,
    displayStatus: resolveTenantDisplayStatus(tenant, billing),
  }));
}

export function getBillingMonthOptions(rows: SheetRow[]): MonthOption[] {
  const unique = [...new Set(rows.map((row) => row.Month).filter(Boolean))];
  return sortMonths(unique).map((value) => ({
    value,
    label: formatMonthLabel(value),
  }));
}

export function getDefaultBillingMonth(rows: SheetRow[]): string {
  const months = getBillingMonthOptions(rows);
  return months.at(-1)?.value ?? "";
}

export function findTenantBillingRow(
  billing: SheetRow[],
  room: number,
  month: string,
): SheetRow | undefined {
  if (!month) return undefined;
  return billing.find(
    (row) =>
      Number(row.Room) === room && billingMonthsMatch(row.Month, month),
  );
}
