"use client";

import { MoreHorizontal } from "lucide-react";
import { formatExpenseAmount, formatExpenseDate } from "@/lib/format";
import { getCategoryBadgeClass } from "@/components/expenses/expenseCategoryBadge";
import type { ExpenseRecord } from "@/types/expense";

interface ExpensesTableProps {
  rows: ExpenseRecord[];
  selectedRow: ExpenseRecord | null;
  onSelectRow: (row: ExpenseRecord) => void;
}

export function ExpensesTable({
  rows,
  selectedRow,
  onSelectRow,
}: ExpensesTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No expenses logged for this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-4 font-medium text-gray-500">Date</th>
            <th className="pb-3 pr-4 text-center font-medium text-gray-500">
              Category
            </th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Description</th>
            <th className="pb-3 pr-4 text-right font-medium text-gray-500">
              Amount
            </th>
            <th className="pb-3 text-right font-medium text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedRow?.id === row.id;

            return (
              <tr
                key={row.id}
                onClick={() => onSelectRow(row)}
                className={`cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-slate-50 ${
                  isSelected ? "bg-slate-50" : ""
                }`}
              >
                <td className="py-4 pr-4 text-navy">
                  {formatExpenseDate(row.date)}
                </td>
                <td className="py-4 pr-4 text-center">
                  <span className={getCategoryBadgeClass(row.category)}>
                    {row.category}
                  </span>
                </td>
                <td className="py-4 pr-4 text-gray-700">{row.description}</td>
                <td className="py-4 pr-4 text-right font-bold text-navy">
                  {formatExpenseAmount(row.amount)}
                </td>
                <td className="py-4 text-right">
                  <button
                    type="button"
                    aria-label={`Actions for ${row.description}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectRow(row);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
