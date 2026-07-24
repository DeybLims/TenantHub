import { ArrowRight, Calendar } from "lucide-react";
import { formatPesoDecimal } from "@/lib/format";
import type { BillingDashboardSummary } from "@/types/billing";

interface BillingSummaryWidgetsProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  summary: BillingDashboardSummary;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-navy focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        <Calendar
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  borderClass,
  titleClass,
  valueClass = "text-navy",
}: {
  title: string;
  value: string;
  subtitle: string;
  borderClass: string;
  titleClass: string;
  valueClass?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 bg-white px-4 py-3 shadow-sm ${borderClass}`}
    >
      <p className={`text-xs font-medium ${titleClass}`}>{title}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

export function BillingSummaryWidgets({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  summary,
}: BillingSummaryWidgetsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-3">
        <DateField label="From" value={fromDate} onChange={onFromDateChange} />
        <ArrowRight
          className="mb-3 h-4 w-4 shrink-0 text-gray-400"
          aria-hidden
        />
        <DateField label="To" value={toDate} onChange={onToDateChange} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-9">
        <SummaryCard
          title="Total Collected"
          value={formatPesoDecimal(summary.totalCollected)}
          subtitle={`${summary.paymentCount} payments`}
          borderClass="border-l-emerald-500"
          titleClass="text-emerald-600"
          valueClass="text-emerald-600"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={formatPesoDecimal(summary.outstandingBalance)}
          subtitle={`${summary.tenantsWithBalance} tenants`}
          borderClass="border-l-orange-500"
          titleClass="text-orange-500"
          valueClass="text-orange-500"
        />
        <SummaryCard
          title="Overdue Accounts"
          value={String(summary.overdueAccounts)}
          subtitle="tenants with unpaid bills"
          borderClass="border-l-red-500"
          titleClass="text-red-500"
          valueClass="text-red-500"
        />
      </div>
    </div>
  );
}
