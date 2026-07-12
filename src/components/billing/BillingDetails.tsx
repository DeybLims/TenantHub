"use client";

import { FileText, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatBillDateBlock,
  formatStatementPeriod,
  summarizeBills,
} from "@/lib/mapBillingViewModel";
import { formatPesoDecimal } from "@/lib/format";
import { getTenantInitials } from "@/lib/tenantInitials";
import {
  getBillingTableStatusClass,
  getBillingTableStatusLabel,
} from "@/components/billing/billingStatusBadge";
import type { Bill } from "@/types/billing";

interface BillingDetailsProps {
  tenantName: string;
  unitCode: string;
  room: number;
  fromDate: string;
  toDate: string;
  bills: Bill[];
  onExportPdf?: () => void;
}

const readOnlyClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-navy";

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
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function ToggleSwitch({ enabled }: { enabled?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-medium text-gray-500">Special Rate</span>
      <div
        className={`relative inline-flex h-5 w-9 items-center rounded-full ${
          enabled ? "bg-blue-500" : "bg-gray-200"
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </div>
    </div>
  );
}

function UtilityRow({
  label,
  reading,
  showToggle = false,
}: {
  label: string;
  reading: Bill["electricity"];
  showToggle?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {showToggle && <ToggleSwitch enabled={reading.specialRate} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="mb-1 text-[10px] text-gray-500">Amount</p>
          <input
            type="text"
            readOnly
            value={formatPesoDecimal(reading.amount)}
            className={readOnlyClass}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] text-gray-500">Previous</p>
          <input
            type="text"
            readOnly
            value={reading.previous.toLocaleString("en-PH")}
            className={readOnlyClass}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] text-gray-500">Current</p>
          <input
            type="text"
            readOnly
            value={reading.current.toLocaleString("en-PH")}
            className={readOnlyClass}
          />
        </div>
      </div>
    </div>
  );
}

function BillHistoryCard({
  bill,
  expanded,
  onToggle,
}: {
  bill: Bill;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dateBlock = formatBillDateBlock(bill.dueDate || bill.billingDate);

  return (
    <article className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-4 text-left hover:bg-slate-50/50"
      >
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-100 text-center">
          <span className="text-[10px] font-bold text-gray-500">
            {dateBlock.month}
          </span>
          <span className="text-lg font-bold text-navy">{dateBlock.day}</span>
          <span className="text-[10px] text-gray-500">{dateBlock.year}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-navy">{bill.id}</p>
            <span className={getBillingTableStatusClass(bill.status)}>
              {getBillingTableStatusLabel(bill.status)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Amount Due</p>
              <p className="font-semibold">{formatPesoDecimal(bill.totalDue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid</p>
              <p className="font-semibold text-emerald-600">
                {formatPesoDecimal(bill.amountPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Balance</p>
              <p
                className={`font-semibold ${
                  bill.balance > 0 ? "text-red-500" : "text-navy"
                }`}
              >
                {formatPesoDecimal(bill.balance)}
              </p>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
          <UtilityRow label="Electricity" reading={bill.electricity} showToggle />
          <UtilityRow label="Water" reading={bill.water} />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Other Charges
            </p>
            <input
              type="text"
              readOnly
              value={formatPesoDecimal(bill.otherCharges)}
              className={readOnlyClass}
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </p>
            <textarea
              readOnly
              rows={2}
              value={bill.notes || ""}
              placeholder="Add notes here..."
              className={`${readOnlyClass} resize-none`}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export function BillingDetails({
  tenantName,
  unitCode,
  room,
  fromDate,
  toDate,
  bills,
  onExportPdf,
}: BillingDetailsProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(
    bills[0]?.id ?? null,
  );

  const periodSummary = useMemo(() => summarizeBills(bills), [bills]);
  const statementPeriod = formatStatementPeriod(fromDate, toDate);

  const statusClass =
    periodSummary.status === "Paid"
      ? "text-emerald-500"
      : periodSummary.status === "Partial"
        ? "text-orange-500"
        : "text-red-500";

  return (
    <article className="flex h-full max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative border-b border-gray-100 px-5 py-5">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          aria-label="Edit billing"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500 text-base font-bold text-white">
            {getTenantInitials(tenantName)}
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-navy">{tenantName}</h3>
            <p className="text-sm text-gray-500">Unit: {unitCode}</p>
            <p className="mt-1 text-xs text-gray-400">Room {room}</p>
          </div>
        </div>

        <p className="mt-4 text-xs font-medium text-gray-500">
          Selected Period:{" "}
          <span className="text-navy">{statementPeriod}</span>
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600">
            Summary for Selected Period
          </h4>
          <SummaryRow
            label="Amount Due"
            value={formatPesoDecimal(periodSummary.amountDue)}
          />
          <SummaryRow
            label="Paid"
            value={formatPesoDecimal(periodSummary.paid)}
            valueClass="text-emerald-600"
          />
          <SummaryRow
            label="Balance"
            value={formatPesoDecimal(periodSummary.balance)}
            valueClass="text-red-500"
          />
          <SummaryRow
            label="Status"
            value={periodSummary.status}
            valueClass={statusClass}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" aria-hidden />
            <h4 className="text-sm font-bold text-navy">Billing History</h4>
          </div>

          {bills.length === 0 ? (
            <p className="text-sm text-gray-500">No bills in this period.</p>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <BillHistoryCard
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
            </div>
          )}
        </section>
      </div>

      {onExportPdf && (
        <div className="border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onExportPdf}
            className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Export to PDF
          </button>
        </div>
      )}
    </article>
  );
}
