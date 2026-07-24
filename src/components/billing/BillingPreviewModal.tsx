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
import {
  getBillingTableStatusClass,
  getBillingTableStatusLabel,
} from "@/components/billing/billingStatusBadge";
import { formatLongDate, formatPesoDecimal } from "@/lib/format";
import {
  formatStatementPeriod,
  summarizeBills,
} from "@/lib/mapBillingViewModel";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { Bill, TenantBillingSummary } from "@/types/billing";

export interface BillingPreviewModalProps {
  open: boolean;
  tenantName: string;
  unitCode: string;
  fromDate: string;
  toDate: string;
  bills: Bill[];
  onClose: () => void;
  onExportPdf: () => void;
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

function BillDetailTable({ bill }: { bill: Bill }) {
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
}: {
  bill: Bill;
  expanded: boolean;
  onToggle: () => void;
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
        <td className="px-4 py-3">
          <span className={getBillingTableStatusClass(bill.status)}>
            {getBillingTableStatusLabel(bill.status)}
          </span>
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
          <td colSpan={7} className="p-0">
            <BillDetailTable bill={bill} />
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
  fromDate,
  toDate,
  bills,
  onClose,
  onExportPdf,
}: BillingPreviewModalProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const summary = useMemo((): TenantBillingSummary => {
    const period = summarizeBills(bills);
    return {
      ...period,
      tenantName,
      unitCode,
      room: bills[0]?.room ?? 0,
      statementPeriod: formatStatementPeriod(fromDate, toDate),
      bills,
    };
  }, [bills, tenantName, unitCode, fromDate, toDate]);

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
          <div>
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

          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-slate-200 px-4 py-3 text-right">
              <p className="text-xs text-gray-500">Statement Period</p>
              <p className="font-semibold text-blue-500">
                {summary.statementPeriod}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Status</p>
              <div className="mt-3">
                <span className={getBillingTableStatusClass(summary.status)}>
                  {getBillingTableStatusLabel(summary.status)}
                </span>
              </div>
            </div>
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
                      <th className="px-4 py-3">Status</th>
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
