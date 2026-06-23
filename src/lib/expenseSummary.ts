import type { ExpenseRecord } from "@/types/expense";

export interface ExpenseKpiSummary {
  totalExpenses: number;
  pending: number;
  paid: number;
}

function isPendingStatus(status: string | undefined): boolean {
  const value = (status ?? "Paid").trim().toLowerCase();
  return value === "pending" || value === "unpaid";
}

export function computeExpenseKpis(rows: ExpenseRecord[]): ExpenseKpiSummary {
  let pending = 0;
  let paid = 0;

  for (const row of rows) {
    if (isPendingStatus(row.status)) {
      pending += row.amount;
    } else {
      paid += row.amount;
    }
  }

  return {
    totalExpenses: pending + paid,
    pending,
    paid,
  };
}
