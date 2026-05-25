import { formatMonthLabel, sortMonths } from "@/lib/months";
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

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBillingStatus(status: string): TenantDisplayStatus | null {
  const value = status.trim().toLowerCase();
  if (value === "paid") return "Paid";
  if (value === "unpaid") return "Unpaid";
  if (value === "partial") return "Partial";
  return null;
}

export function resolveTenantDisplayStatus(
  tenant: TenantRecord,
  billingRow: SheetRow | undefined,
): TenantDisplayStatus {
  if (tenant.Status === "Vacant") {
    return "Vacant";
  }

  if (billingRow) {
    return normalizeBillingStatus(String(billingRow.Status)) ?? "No Bill";
  }

  return "No Bill";
}

export function joinTenantsWithBilling(
  tenants: TenantRecord[],
  billing: SheetRow[],
  selectedMonth: string,
): TenantTableRow[] {
  if (!selectedMonth) {
    return tenants.map((tenant) => ({
      ...tenant,
      displayStatus: resolveTenantDisplayStatus(tenant, undefined),
    }));
  }

  const monthBilling = billing.filter((row) => row.Month === selectedMonth);

  return tenants.map((tenant) => {
    const billingRow = monthBilling.find(
      (row) => readRoom(row.Room) === tenant.Room,
    );

    return {
      ...tenant,
      displayStatus: resolveTenantDisplayStatus(tenant, billingRow),
    };
  });
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
    (row) => readRoom(row.Room) === room && row.Month === month,
  );
}
