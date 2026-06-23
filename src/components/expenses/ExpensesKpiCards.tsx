import { formatExpenseAmount } from "@/lib/format";
import type { ExpenseKpiSummary } from "@/lib/expenseSummary";

interface ExpensesKpiCardsProps {
  summary: ExpenseKpiSummary;
}

export function ExpensesKpiCards({ summary }: ExpensesKpiCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Total Expenses
        </p>
        <p className="mt-2 text-2xl font-bold text-navy">
          {formatExpenseAmount(summary.totalExpenses)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Pending
        </p>
        <p className="mt-2 text-2xl font-bold text-amber-700">
          {formatExpenseAmount(summary.pending)}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Paid
        </p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">
          {formatExpenseAmount(summary.paid)}
        </p>
      </div>
    </div>
  );
}
