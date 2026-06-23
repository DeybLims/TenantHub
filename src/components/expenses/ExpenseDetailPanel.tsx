"use client";

import { Pencil } from "lucide-react";
import { formatExpenseAmount, formatExpenseDate } from "@/lib/format";
import {
  getCategoryAvatarClass,
  getExpenseCategoryInitials,
} from "@/lib/expenseCategoryInitials";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import type { ExpenseRecord } from "@/types/expense";

interface ExpenseDetailPanelProps {
  expense: ExpenseRecord;
}

const readOnlyFieldClass = `${floatingInputClass} cursor-default bg-gray-50 text-navy`;

export function ExpenseDetailPanel({ expense }: ExpenseDetailPanelProps) {
  const initials = getExpenseCategoryInitials(expense.category);
  const avatarClass = getCategoryAvatarClass(expense.category);

  return (
    <article className="flex h-full min-h-[520px] flex-col rounded-xl bg-surface-card shadow-card transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-navy">Expense Details</h2>
        <button
          type="button"
          aria-label="Edit expense"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${avatarClass}`}
          >
            {initials}
          </div>
          <h3 className="text-lg font-bold text-navy">{expense.category}</h3>
        </div>

        <div className="space-y-4">
          <FloatingLabelField label="Category">
            <select
              value={expense.category}
              disabled
              className={readOnlyFieldClass}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              {!EXPENSE_CATEGORIES.includes(
                expense.category as (typeof EXPENSE_CATEGORIES)[number],
              ) && <option value={expense.category}>{expense.category}</option>}
            </select>
          </FloatingLabelField>

          <FloatingLabelField label="Date">
            <input
              type="text"
              readOnly
              value={formatExpenseDate(expense.date)}
              className={readOnlyFieldClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Amount">
            <input
              type="text"
              readOnly
              value={formatExpenseAmount(expense.amount)}
              className={`${readOnlyFieldClass} font-bold`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Description">
            <input
              type="text"
              readOnly
              value={expense.description || "—"}
              className={readOnlyFieldClass}
            />
          </FloatingLabelField>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <button
          type="button"
          className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete Expense
        </button>
      </div>
    </article>
  );
}
