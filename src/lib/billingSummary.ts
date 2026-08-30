import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
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

/** One table row per tenant — totals all bills in the filtered range. */
export function aggregateBillingRowsByTenant(
  rows: BillingTableRow[],
): BillingTableRow[] {
  const byRoom = new Map<number, BillingTableRow[]>();

  for (const row of rows) {
    const roomRows = byRoom.get(row.room) ?? [];
    roomRows.push(row);
    byRoom.set(row.room, roomRows);
  }

  return Array.from(byRoom.entries())
    .map(([room, roomRows]) => {
      const sorted = [...roomRows].sort(
        (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime(),
      );
      const latest = sorted[0];
      const totalDue = roundCurrency(
        roomRows.reduce((sum, row) => sum + row.totalDue, 0),
      );
      const paid = roundCurrency(
        roomRows.reduce((sum, row) => sum + row.paid, 0),
      );
      const balance = roundCurrency(Math.max(0, totalDue - paid));

      let status = "Unpaid";
      if (balance <= 0 && totalDue > 0) status = "Paid";
      else if (paid > 0 && balance > 0) status = "Partial";

      return {
        ...latest,
        room,
        totalDue,
        paid,
        balance,
        status,
        month: latest.month,
      };
    })
    .sort((a, b) => a.room - b.room);
}

export function formatBillingDateRange(fromDate: string, toDate: string): string {
  const format = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const fromLabel = format(fromDate);
  const toLabel = format(toDate);

  if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
  return fromLabel || toLabel || "—";
}
