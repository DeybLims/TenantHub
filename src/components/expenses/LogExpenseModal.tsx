"use client";

import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { saveExpense } from "@/services/api";
import { EXPENSE_CATEGORIES, type SaveExpensePayload } from "@/types/expense";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";

interface LogExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogExpenseModal({
  open,
  onClose,
  onSuccess,
}: LogExpenseModalProps) {
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription("");
    setAmount("");
    setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload: SaveExpensePayload) => saveExpense(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!date || !category || !description.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    const amountNum = readSheetNumber(amount);
    if (amountNum <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    mutation.mutate({
      date,
      category,
      description: description.trim(),
      amount: amountNum,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-expense-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="log-expense-title" className="text-lg font-bold text-navy">
            Log New Expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <FloatingLabelField label="Date">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={floatingInputClass}
              required
            />
          </FloatingLabelField>

          <FloatingLabelField label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={floatingInputClass}
              required
            >
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FloatingLabelField>

          <FloatingLabelField label="Description">
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What was paid for?"
              className={floatingInputClass}
              required
            />
          </FloatingLabelField>

          <FloatingLabelField label="Amount">
            <input
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Value"
              className={floatingInputClass}
              required
            />
          </FloatingLabelField>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
