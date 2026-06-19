import { formatPesoDecimal } from "@/lib/format";
import type { BillingKpiSummary } from "@/lib/billingSummary";

interface BillingKpiCardsProps {
  summary: BillingKpiSummary;
}

export function BillingKpiCards({ summary }: BillingKpiCardsProps) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Total Due
        </p>
        <p className="mt-1 text-lg font-bold text-navy">
          {formatPesoDecimal(summary.totalDue)}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Paid
        </p>
        <p className="mt-1 text-lg font-bold text-emerald-700">
          {formatPesoDecimal(summary.paid)}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Unpaid
        </p>
        <p className="mt-1 text-lg font-bold text-red-600">
          {formatPesoDecimal(summary.unpaid)}
        </p>
      </div>
    </div>
  );
}
