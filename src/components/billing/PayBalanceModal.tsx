"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatPesoDecimal } from "@/lib/format";
import {
  billUserNotes,
  formatStatementPeriodCompact,
} from "@/lib/mapBillingViewModel";
import { billingMonthToDateInput } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { updateBill } from "@/services/api";
import type { Bill, UpdateBillPayload } from "@/types/billing";

function toOptionalIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const fromMonth = billingMonthToDateInput(trimmed);
  if (fromMonth) return fromMonth;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

export type PaymentMethod = "cash" | "bank" | "online";

export interface PayBalanceModalProps {
  open: boolean;
  bill: Bill | null;
  fromDate: string;
  toDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const paymentMethods: Array<{
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Banknote;
}> = [
  {
    id: "cash",
    label: "Cash Payment",
    description: "Pay in person",
    icon: Banknote,
  },
  {
    id: "bank",
    label: "Bank Transfer",
    description: "Transfer via online banking",
    icon: Building2,
  },
  {
    id: "online",
    label: "Online Payment",
    description: "Pay using QR code",
    icon: Smartphone,
  },
];

function deriveStatus(totalDue: number, paid: number): string {
  const balance = totalDue - paid;
  if (balance <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
}

function buildPaymentPayload(
  bill: Bill,
  paymentAmount: number,
  _method: PaymentMethod,
  reference: string,
  paymentDate: string,
): UpdateBillPayload {
  const newPaid = bill.amountPaid + paymentAmount;
  // User notes only — never stack CASH/BANK/ONLINE payment lines into Notes.
  // Optional reference from Pay Balance is stored as a normal note if provided.
  const notes = [billUserNotes(bill.notes), reference.trim()]
    .filter(Boolean)
    .join("\n");

  return {
    month: bill.billingMonth,
    room: String(bill.room),
    rent: bill.baseRent,
    ePrev: bill.electricity.previous,
    eCurr: bill.electricity.current,
    eRate:
      bill.electricity.current > bill.electricity.previous
        ? bill.electricity.amount /
          (bill.electricity.current - bill.electricity.previous)
        : 14,
    eBill: bill.electricity.amount,
    wPrev: bill.water.previous,
    wCurr: bill.water.current,
    wRate:
      bill.water.current > bill.water.previous
        ? bill.water.amount / (bill.water.current - bill.water.previous)
        : 30,
    wBill: bill.water.amount,
    adjustment: bill.otherCharges,
    totalDue: bill.totalDue,
    paid: newPaid,
    status: deriveStatus(bill.totalDue, newPaid),
    billingDate: toOptionalIsoDate(bill.billingDate),
    dueDate: toOptionalIsoDate(bill.dueDate),
    datePaid: toOptionalIsoDate(paymentDate),
    notes: notes || undefined,
  };
}

export function PayBalanceModal({
  open,
  bill,
  fromDate,
  toDate,
  onClose,
  onSuccess,
}: PayBalanceModalProps) {
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const outstanding = bill?.balance ?? 0;
  const statementPeriod = formatStatementPeriodCompact(fromDate, toDate);

  useEffect(() => {
    if (!open) return;
    // Prefer plain numeric text so "Proceed" stays enabled without comma-parse issues.
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(outstanding > 0 ? outstanding.toFixed(2) : "");
    setMethod("bank");
    setReference("");
    setError(null);
  }, [open, outstanding]);

  const paymentAmount = readSheetNumber(amount);
  const amountInvalid =
    paymentAmount <= 0 || (bill != null && paymentAmount > bill.balance);

  const mutation = useMutation({
    mutationFn: (payload: UpdateBillPayload) => updateBill(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const canSubmit = useMemo(
    () => Boolean(bill && paymentDate && !amountInvalid && !mutation.isPending),
    [amountInvalid, bill, mutation.isPending, paymentDate],
  );

  if (!open || !bill) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Enter a valid payment amount.");
      return;
    }

    mutation.mutate(
      buildPaymentPayload(bill, paymentAmount, method, reference, paymentDate),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-balance-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Wallet className="h-5 w-5 text-blue-600" aria-hidden />
            </div>
            <div>
              <h2 id="pay-balance-title" className="text-lg font-bold text-navy">
                Pay Balance
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Review your balance and enter the payment details.
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 border-red-100 sm:border-r sm:pr-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Wallet className="h-5 w-5 text-red-500" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Outstanding Balance
                </p>
                <p className="mt-1 text-xl font-bold text-red-500">
                  {formatPesoDecimal(outstanding)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:pl-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Statement Period
                </p>
                <p className="mt-1 text-sm font-bold text-blue-600">
                  {statementPeriod}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Amount to Pay
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                ₱
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={`${inputClass} pl-8`}
                required
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">
              Payment Method
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {paymentMethods.map(({ id, label, description, icon: Icon }) => {
                const selected = method === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          selected ? "text-blue-600" : "text-gray-500"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy">{label}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`mt-2 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                        selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {selected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Reference / Notes (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Enter reference number or notes (e.g. transaction ID)"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              {mutation.isPending ? "Processing…" : "Proceed to Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
