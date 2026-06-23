import { Wallet } from "lucide-react";

export function ExpenseDetailPlaceholder() {
  return (
    <article className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-surface-card px-6 py-12 text-center shadow-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Wallet className="h-7 w-7 text-gray-400" aria-hidden />
      </div>
      <h2 className="text-base font-semibold text-navy">Expense Details</h2>
      <p className="mt-2 max-w-[220px] text-sm text-gray-500">
        Select an expense from the ledger to view its full breakdown here.
      </p>
    </article>
  );
}
