"use client";

import {
  ChevronDown,
  ChevronUp,
  FileText,
  PiggyBank,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatLongDate, formatPesoDecimal } from "@/lib/format";
import {
  formatStatementPeriodCompact,
  summarizeBills,
} from "@/lib/mapBillingViewModel";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { Bill } from "@/types/billing";

export interface BillingPreviewModalProps {
  open: boolean;
  tenantName: string;
  unitCode: string;
  bills: Bill[];
  fromDate: string;
  toDate: string;
  onClose: () => void;
  onExportPdf: () => void;
  onPayBalance?: (bill: Bill) => void;
}

function SummaryCard({
  label,
  value,
  icon,
  valueClass = "text-navy",
  iconWrapClass,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  valueClass?: string;
  iconWrapClass: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconWrapClass}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function parsePaymentActivities(bill: Bill): string[] {
  const fromNotes =
    bill.notes
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(CASH|BANK TRANSFER|ONLINE|PAYMENT)/i.test(line)) ??
    [];

  if (fromNotes.length > 0) return fromNotes;

  if (bill.amountPaid > 0) {
    return [
      [
        bill.datePaid ? formatLongDate(bill.datePaid) : "Payment recorded",
        `CASH - ${formatPesoDecimal(bill.amountPaid)}`,
      ].join(" "),
    ];
  }

  return [];
}

function BillDetailTable({
  bill,
  onPayBalance,
}: {
  bill: Bill;
  onPayBalance?: (bill: Bill) => void;
}) {
  const paymentActivities = parsePaymentActivities(bill);

  return (
    <div className="space-y-3 bg-blue-50/40 px-4 py-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="bg-blue-100 text-xs font-bold uppercase tracking-wide text-blue-900">
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5 text-right">Previous</th>
              <th className="px-4 py-2.5 text-right">Current</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-medium text-navy">Electricity</td>
              <td className="px-4 py-2.5 text-right text-gray-600">
                {bill.electricity.previous.toLocaleString("en-PH")}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-600">
                {bill.electricity.current.toLocaleString("en-PH")}
              </td>
              <td className="px-4 py-2.5 text-right">
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span className="font-semibold text-navy">
                    {formatPesoDecimal(bill.electricity.amount)}
                  </span>
                  {bill.electricity.specialRate && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Special Rate Applied
                    </span>
                  )}
                </span>
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-medium text-navy">Water</td>
              <td className="px-4 py-2.5 text-right text-gray-600">
                {bill.water.previous.toLocaleString("en-PH")}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-600">
                {bill.water.current.toLocaleString("en-PH")}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-navy">
                {formatPesoDecimal(bill.water.amount)}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-medium text-navy">Other Charges</td>
              <td className="px-4 py-2.5 text-right text-gray-400">—</td>
              <td className="px-4 py-2.5 text-right text-gray-400">—</td>
              <td className="px-4 py-2.5 text-right font-semibold text-navy">
                {formatPesoDecimal(bill.otherCharges)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {paymentActivities.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Payment Activity
          </p>
          <ul className="mt-2 space-y-2">
            {paymentActivities.map((activity, index) => (
              <li
                key={`${bill.id}-activity-${index}`}
                className="text-sm font-semibold text-emerald-800"
              >
                {activity}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bill.status === "Partial" && bill.balance > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <p className="font-semibold">Partial Payment</p>
          <p className="mt-1">
            Paid {formatPesoDecimal(bill.amountPaid)} of{" "}
            {formatPesoDecimal(bill.totalDue)} · Balance{" "}
            {formatPesoDecimal(bill.balance)}
          </p>
          {onPayBalance && (
            <button
              type="button"
              onClick={() => onPayBalance(bill)}
              className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600"
            >
              Pay Balance
            </button>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Notes
        </label>
        <textarea
          readOnly
          rows={2}
          value={bill.notes || ""}
          placeholder="Add notes here..."
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy"
        />
      </div>
    </div>
  );
}

function BillHistoryRow({
  bill,
  expanded,
  onToggle,
  onPayBalance,
}: {
  bill: Bill;
  expanded: boolean;
  onToggle: () => void;
  onPayBalance?: (bill: Bill) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-slate-100 transition-colors ${
          expanded ? "bg-blue-50" : "bg-white hover:bg-slate-50"
        }`}
      >
        <td className="px-4 py-3 text-sm text-navy">
          {formatLongDate(bill.dueDate || bill.billingDate)}
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-blue-500">
          {bill.id}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-navy">
          {formatPesoDecimal(bill.totalDue)}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-emerald-600">
          {formatPesoDecimal(bill.amountPaid)}
        </td>
        <td
          className={`px-4 py-3 text-sm font-medium ${
            bill.balance > 0 ? "text-red-500" : "text-navy"
          }`}
        >
          {formatPesoDecimal(bill.balance)}
        </td>
        <td className="px-3 py-3 text-gray-400">
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <BillDetailTable bill={bill} onPayBalance={onPayBalance} />
          </td>
        </tr>
      )}
    </>
  );
}

export function BillingPreviewModal({
  open,
  tenantName,
  unitCode,
  bills,
  fromDate,
  toDate,
  onClose,
  onExportPdf,
  onPayBalance,
}: BillingPreviewModalProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeBills(bills), [bills]);
  const statementPeriod = formatStatementPeriodCompact(fromDate, toDate);
  const payableBill =
    bills.find((bill) => bill.balance > 0) ?? bills[0] ?? null;

  useEffect(() => {
    if (!open) {
      setExpandedBillId(null);
      return;
    }
    setExpandedBillId(bills[0]?.id ?? null);
  }, [open, bills]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-preview-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2
              id="billing-preview-title"
              className="text-lg font-bold text-navy"
            >
              Tenant Invoice
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                  {getTenantInitials(tenantName)}
                </div>
                <div>
                  <p className="font-bold uppercase text-navy">{tenantName}</p>
                  <p className="text-sm text-gray-500">Unit: {unitCode}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Statement Period
              </p>
              <p className="text-xs font-bold text-blue-600">{statementPeriod}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Amount Due"
              value={formatPesoDecimal(summary.amountDue)}
              icon={<FileText className="h-4 w-4 text-blue-600" aria-hidden />}
              iconWrapClass="bg-blue-100"
            />
            <SummaryCard
              label="Paid"
              value={formatPesoDecimal(summary.paid)}
              valueClass="text-emerald-600"
              icon={<Wallet className="h-4 w-4 text-emerald-600" aria-hidden />}
              iconWrapClass="bg-emerald-100"
            />
            <SummaryCard
              label="Balance"
              value={formatPesoDecimal(summary.balance)}
              valueClass="text-red-500"
              icon={<PiggyBank className="h-4 w-4 text-red-500" aria-hidden />}
              iconWrapClass="bg-red-100"
            />
            {onPayBalance && payableBill && summary.balance > 0 && (
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => onPayBalance(payableBill)}
                  className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Pay Balance
                </button>
              </div>
            )}
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold text-navy">
              Billing History (Within Selected Range)
            </h3>

            {bills.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-gray-500">
                No bills in this period.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="bg-blue-500 text-xs font-semibold uppercase tracking-wide text-white">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Bill #</th>
                      <th className="px-4 py-3">Amount Due</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="w-10 px-3 py-3" aria-label="Expand" />
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <BillHistoryRow
                        key={bill.id}
                        bill={bill}
                        expanded={expandedBillId === bill.id}
                        onToggle={() =>
                          setExpandedBillId((current) =>
                            current === bill.id ? null : bill.id,
                          )
                        }
                        onPayBalance={onPayBalance}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onExportPdf}
            disabled={bills.length === 0}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export to PDF
          </button>
        </div>
      </div>
    </div>
  );
}
