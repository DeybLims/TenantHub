import type { BillingTableRow } from "@/types/billing";

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
