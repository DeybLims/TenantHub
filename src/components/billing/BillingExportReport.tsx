import type { ReactNode } from "react";
import { FileText, KeyRound } from "lucide-react";
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
import type { Bill, BillingPeriodSummary, BillPaymentStatus } from "@/types/billing";

export interface BillingExportReportProps {
  tenantName: string;
  unitCode: string;
  fromDate: string;
  toDate: string;
  bills: Bill[];
  periodSummary?: BillingPeriodSummary;
  generatedAt?: Date;
}

function statusPillClass(status: BillPaymentStatus | string): string {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Partial") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function SummaryRow({
  label,
  value,
  valueClass = "text-navy",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-blue-100/80 py-2 text-sm last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function UtilityTable({ bill }: { bill: Bill }) {
  const rows: Array<{
    description: string;
    previous: string;
    current: string;
    amount: string;
  }> = [
    {
      description: "Base Rent",
      previous: "—",
      current: "—",
      amount: formatPesoDecimal(bill.baseRent),
    },
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
  ];

  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="bg-blue-100 text-left text-[11px] font-bold uppercase tracking-wide text-blue-900">
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
            <td className="border border-gray-200 px-3 py-2 font-medium text-navy">
              {row.description}
              {row.description === "Electricity" && bill.electricity.specialRate ? (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Special Rate
                </span>
              ) : null}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right text-gray-600">
              {row.previous}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right text-gray-600">
              {row.current}
            </td>
            <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-navy">
              {row.amount}
            </td>
          </tr>
        ))}
        {bill.notes ? (
          <tr>
            <td
              colSpan={4}
              className="border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-600"
            >
              <span className="font-medium text-gray-500">Notes: </span>
              {bill.notes}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function BillCard({ bill }: { bill: Bill }) {
  return (
    <article className="mb-5 break-inside-avoid rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-navy">Bill #{bill.id}</h4>
          <p className="mt-0.5 text-sm text-red-500">
            Due Date: {bill.dueDate ? formatLongDate(bill.dueDate) : "—"}
          </p>
          {(bill.tenantName || bill.unitCode) && (
            <p className="mt-1 text-xs text-gray-500">
              {bill.tenantName}
              {bill.unitCode ? ` · ${bill.unitCode}` : ""}
            </p>
          )}
        </div>
        <div className="min-w-[180px] text-sm">
          <SummaryRow
            label="Amount Due"
            value={formatPesoDecimal(bill.totalDue)}
          />
          <SummaryRow
            label="Paid"
            value={formatPesoDecimal(bill.amountPaid)}
            valueClass="text-emerald-600"
          />
          <SummaryRow
            label="Balance"
            value={formatPesoDecimal(bill.balance)}
            valueClass={bill.balance > 0 ? "text-red-500" : "text-navy"}
          />
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-600">Status</span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(bill.status)}`}
            >
              {bill.status}
            </span>
          </div>
        </div>
      </div>
      <UtilityTable bill={bill} />
    </article>
  );
}

function SectionBanner({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 rounded-t-md bg-blue-500 px-4 py-2.5 text-white">
        <FileText className="h-4 w-4 shrink-0" aria-hidden />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/**
 * Print-ready billing export layout (interim until designer delivers a final PDF mock).
 * Used by browser print → Save as PDF.
 */
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

  const isPortfolio = unitCode === "Portfolio" || tenantName === "All Tenants";

  return (
    <div
      id="billing-export-report"
      className="mx-auto max-w-[900px] bg-white px-8 py-10 text-navy"
    >
      <header className="mb-8 border-b-2 border-blue-500 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500 text-white">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-blue-500">
                TenantHub
              </p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold tracking-[0.08em] text-blue-500">
              BILLING REPORT
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Generated on {timestamp}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500 text-base font-bold text-white">
            {getTenantInitials(tenantName)}
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-navy">
              {tenantName}
            </h2>
            <p className="text-sm text-gray-500">
              {isPortfolio ? "All units in range" : `Unit: ${unitCode || "—"}`}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3 text-right">
          <p className="text-xs font-medium text-gray-500">Statement Period</p>
          <p className="mt-0.5 font-bold text-blue-600">{statementPeriod}</p>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600">
          Summary for Selected Period
        </h3>
        <SummaryRow
          label="Amount Due"
          value={formatExpenseAmount(summary.amountDue)}
        />
        <SummaryRow
          label="Paid"
          value={formatExpenseAmount(summary.paid)}
          valueClass="text-emerald-600"
        />
        <SummaryRow
          label="Balance"
          value={formatExpenseAmount(summary.balance)}
          valueClass="text-red-500"
        />
        <div className="flex items-center justify-between py-2 text-sm">
          <span className="text-gray-600">Status</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(summary.status)}`}
          >
            {summary.status}
          </span>
        </div>
      </section>

      <SectionBanner title="Billing Summary">
        {bills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            No bills found for this statement period.
          </p>
        ) : (
          bills.map((bill) => <BillCard key={bill.id} bill={bill} />)
        )}
      </SectionBanner>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
        TenantHub Billing Report · {bills.length} bill
        {bills.length === 1 ? "" : "s"} · Confidential
      </footer>
    </div>
  );
}
