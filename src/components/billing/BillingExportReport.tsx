import type { ReactNode } from "react";
import { FileText, KeyRound } from "lucide-react";
import {
  getBillingTableStatusClass,
  getBillingTableStatusLabel,
} from "@/components/billing/billingStatusBadge";
import {
  formatStatementPeriod,
  summarizeBills,
} from "@/lib/mapBillingViewModel";
import {
  formatExpenseAmount,
  formatLongDate,
  formatPesoDecimal,
} from "@/lib/format";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { Bill, BillingPeriodSummary } from "@/types/billing";

export interface BillingExportReportProps {
  tenantName: string;
  unitCode: string;
  fromDate: string;
  toDate: string;
  bills: Bill[];
  periodSummary?: BillingPeriodSummary;
  generatedAt?: Date;
}

function SummaryLine({
  label,
  value,
  valueClass = "text-navy",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function UtilityTable({ bill }: { bill: Bill }) {
  const rows = [
    {
      description: "Electricity",
      previous: bill.electricity.previous.toLocaleString("en-PH"),
      current: bill.electricity.current.toLocaleString("en-PH"),
      amount: formatPesoDecimal(bill.electricity.amount),
    },
    {
      description: "Water",
      previous: bill.water.previous.toLocaleString("en-PH"),
      current: bill.water.current.toLocaleString("en-PH"),
      amount: formatPesoDecimal(bill.water.amount),
    },
    {
      description: "Other Charges",
      previous: "—",
      current: "—",
      amount: formatPesoDecimal(bill.otherCharges),
    },
    {
      description: "Notes",
      previous: bill.notes || "—",
      current: "",
      amount: "",
    },
  ];

  return (
    <table className="mt-4 w-full border-collapse text-sm">
      <thead>
        <tr className="bg-blue-100 text-left text-xs font-bold uppercase text-blue-900">
          <th className="border border-gray-200 px-3 py-2">Description</th>
          <th className="border border-gray-200 px-3 py-2 text-right">
            Previous
          </th>
          <th className="border border-gray-200 px-3 py-2 text-right">
            Current
          </th>
          <th className="border border-gray-200 px-3 py-2 text-right">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${bill.id}-${row.description}`}>
            <td className="border border-gray-200 px-3 py-2 font-medium">
              {row.description}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right text-gray-600">
              {row.previous}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right text-gray-600">
              {row.current || "—"}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right font-medium">
              {row.amount || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 bg-blue-500 px-4 py-2 text-white">
        <FileText className="h-4 w-4" aria-hidden />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function BillingExportReport({
  tenantName,
  unitCode,
  fromDate,
  toDate,
  bills,
  periodSummary,
  generatedAt = new Date(),
}: BillingExportReportProps) {
  const summary = periodSummary ?? summarizeBills(bills);
  const statementPeriod = formatStatementPeriod(fromDate, toDate);
  const timestamp = generatedAt.toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      id="billing-export-report"
      className="mx-auto max-w-[900px] border border-gray-200 bg-white p-8 text-navy print:border-0 print:p-0"
    >
      <header className="mb-6 border-b-2 border-blue-500 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-500">TenantHub</p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold tracking-wide text-blue-500">
              BILLING REPORT
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Generated on {timestamp}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
            {getTenantInitials(tenantName)}
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase">{tenantName}</h2>
            <p className="text-sm text-gray-500">Unit: {unitCode}</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3 text-right">
          <p className="text-xs text-gray-500">Statement Period</p>
          <p className="font-bold text-blue-600">{statementPeriod}</p>
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600">
          Summary for Selected Period
        </h3>
        <SummaryLine
          label="Amount Due"
          value={formatExpenseAmount(summary.amountDue)}
        />
        <SummaryLine
          label="Paid"
          value={formatExpenseAmount(summary.paid)}
          valueClass="text-emerald-600"
        />
        <SummaryLine
          label="Balance"
          value={formatExpenseAmount(summary.balance)}
          valueClass="text-red-500"
        />
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-gray-600">Status</span>
          <span className={getBillingTableStatusClass(summary.status)}>
            {getBillingTableStatusLabel(summary.status)}
          </span>
        </div>
      </section>

      <ReportSection title="Billing Summary">
        {bills.length === 0 ? (
          <p className="text-sm text-gray-500">No bills in this period.</p>
        ) : (
          bills.map((bill) => (
            <article key={bill.id} className="mb-6 border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold">Bill #{bill.id}</h4>
                  <p className="text-sm text-red-500">
                    Due Date:{" "}
                    {bill.dueDate ? formatLongDate(bill.dueDate) : "—"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <SummaryLine
                    label="Amount Due"
                    value={formatPesoDecimal(bill.totalDue)}
                  />
                  <SummaryLine
                    label="Paid"
                    value={formatPesoDecimal(bill.amountPaid)}
                    valueClass="text-emerald-600"
                  />
                  <SummaryLine
                    label="Balance"
                    value={formatPesoDecimal(bill.balance)}
                    valueClass="text-red-500"
                  />
                  <div className="flex items-center justify-end gap-2 py-1.5">
                    <span className="text-gray-600">Status</span>
                    <span className={getBillingTableStatusClass(bill.status)}>
                      {getBillingTableStatusLabel(bill.status)}
                    </span>
                  </div>
                </div>
              </div>
              <UtilityTable bill={bill} />
            </article>
          ))
        )}
      </ReportSection>
    </div>
  );
}
