"use client";

import { formatPesoDecimal } from "@/lib/format";
import { formatMonthLabel } from "@/lib/months";
import {
  getBillingTableStatusClass,
  getBillingTableStatusLabel,
} from "@/components/billing/billingStatusBadge";
import type { BillingTableRow } from "@/types/billing";

interface BillingTableProps {
  rows: BillingTableRow[];
  selectedRow: BillingTableRow | null;
  onSelectRow: (row: BillingTableRow) => void;
}

export function BillingTable({
  rows,
  selectedRow,
  onSelectRow,
}: BillingTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No billing records for the selected period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-5 py-3.5 font-semibold text-navy">
              Unit Code / Tenant
            </th>
            <th className="px-4 py-3.5 font-semibold text-navy">
              Billing Period
            </th>
            <th className="px-4 py-3.5 font-semibold text-navy">Amount Due</th>
            <th className="px-4 py-3.5 font-semibold text-navy">Paid</th>
            <th className="px-4 py-3.5 font-semibold text-navy">Balance</th>
            <th className="px-5 py-3.5 font-semibold text-navy">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = `${row.month}-${row.room}`;
            const isSelected =
              selectedRow?.month === row.month &&
              selectedRow?.room === row.room;

            return (
              <tr
                key={rowKey}
                onClick={() => onSelectRow(row)}
                className={`cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-slate-50/80 ${
                  isSelected ? "bg-slate-50" : "bg-white"
                }`}
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-navy">{row.unitCode}</p>
                  <p className="mt-0.5 text-gray-500">{row.tenantName}</p>
                </td>
                <td className="px-4 py-3.5 text-gray-600">
                  {formatMonthLabel(row.month)}
                </td>
                <td className="px-4 py-3.5 font-medium text-navy">
                  {formatPesoDecimal(row.totalDue)}
                </td>
                <td className="px-4 py-3.5 font-medium text-emerald-600">
                  {formatPesoDecimal(row.paid)}
                </td>
                <td
                  className={`px-4 py-3.5 font-medium ${
                    row.balance > 0 ? "text-red-500" : "text-gray-600"
                  }`}
                >
                  {formatPesoDecimal(row.balance)}
                </td>
                <td className="px-5 py-3.5">
                  <span className={getBillingTableStatusClass(row.status)}>
                    {getBillingTableStatusLabel(row.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
