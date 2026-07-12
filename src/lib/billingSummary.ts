import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import type { BillingDashboardSummary, BillingTableRow } from "@/types/billing";

export interface BillingKpiSummary {
  totalDue: number;
  paid: number;
  unpaid: number;
}

export function computeBillingKpis(rows: BillingTableRow[]): BillingKpiSummary {
  return rows.reduce(
    (acc, row) => ({
      totalDue: acc.totalDue + row.totalDue,
      paid: acc.paid + row.paid,
      unpaid: acc.unpaid + Math.max(0, row.balance),
    }),
    { totalDue: 0, paid: 0, unpaid: 0 },
  );
}

function isOverdue(row: BillingTableRow): boolean {
  const status = normalizeBillingStatusLabel(row.status);
  return status === "Unpaid" || status === "Partial";
}

export function computeBillingDashboardSummary(
  rows: BillingTableRow[],
): BillingDashboardSummary {
  const paymentCount = rows.filter((row) => row.paid > 0).length;
  const totalCollected = rows.reduce((sum, row) => sum + row.paid, 0);
  const outstandingBalance = rows.reduce(
    (sum, row) => sum + Math.max(0, row.balance),
    0,
  );
  const tenantsWithBalance = rows.filter((row) => row.balance > 0).length;
  const overdueAccounts = rows.filter((row) => isOverdue(row) && row.balance > 0)
    .length;

  return {
    totalCollected,
    paymentCount,
    outstandingBalance,
    tenantsWithBalance,
    overdueAccounts,
  };
}

export function filterBillingRowsByDateRange(
  rows: BillingTableRow[],
  fromDate: string,
  toDate: string,
): BillingTableRow[] {
  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  if (to) to.setHours(23, 59, 59, 999);

  return rows.filter((row) => {
    const monthDate = new Date(row.month);
    if (Number.isNaN(monthDate.getTime())) return true;
    if (from && monthDate < from) return false;
    if (to && monthDate > to) return false;
    return true;
  });
}
