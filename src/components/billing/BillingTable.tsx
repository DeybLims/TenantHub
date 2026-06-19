"use client";

import { formatPeso, formatPesoDecimal } from "@/lib/format";
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
        No billing records for this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-4 font-medium text-gray-500">
              Unit Code / Tenant
            </th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Base Rent</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Electricity</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Water</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">
              Other Charges
            </th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Total Due</th>
            <th className="pb-3 text-center font-medium text-gray-500">
              Status
            </th>
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
                className={`cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-slate-50 ${
                  isSelected ? "bg-slate-50" : ""
                }`}
              >
                <td className="py-4 pr-4">
                  <p className="font-bold text-navy">{row.unitCode}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{row.tenantName}</p>
                </td>
                <td className="py-4 pr-4">
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-navy">
                    {formatPeso(row.rent)}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <p className="font-semibold text-navy">
                    {formatPesoDecimal(row.elecBill)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Prev: {row.elecPrev.toLocaleString("en-PH")} | Curr:{" "}
                    {row.elecCurr.toLocaleString("en-PH")}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  <p className="font-semibold text-navy">
                    {formatPesoDecimal(row.waterBill)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Prev: {row.waterPrev.toLocaleString("en-PH")} | Curr:{" "}
                    {row.waterCurr.toLocaleString("en-PH")}
                  </p>
                </td>
                <td className="py-4 pr-4 text-gray-700">
                  {formatPesoDecimal(row.otherCharges)}
                </td>
                <td className="py-4 pr-4">
                  <span className="font-bold text-navy">
                    {formatPesoDecimal(row.totalDue)}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={getBillingTableStatusClass(row.status)}>
                    {getBillingTableStatusLabel(row.status)}
                  </span>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Balance: {formatPesoDecimal(row.balance)}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
