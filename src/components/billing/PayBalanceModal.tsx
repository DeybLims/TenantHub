"use client";

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
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { usePayBalanceMutation } from "@/hooks/useBillingMutations";
import { isCommittedFailure } from "@/lib/billingErrors";
import { formatPesoDecimal } from "@/lib/format";
import {
  allocatePaymentAcrossBills,
  formatStatementPeriodCompact,
  unpaidBillsOldestFirst,
} from "@/lib/mapBillingViewModel";
import { manilaToday, toManilaDate } from "@/lib/manilaTime";
import { billingMonthToDateInput, formatMonthLabel } from "@/lib/months";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { Bill } from "@/types/billing";

export type PaymentMethod = "cash" | "bank" | "online";

export interface PayBalanceModalProps {
  open: boolean;
  /** Every bill for the current occupant; unpaid ones are paid oldest-first. */
  bills: Bill[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const dateInputClass = `${inputClass} [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`;

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

export function PayBalanceModal({
  open,
  bills,
  onClose,
  onSuccess,
}: PayBalanceModalProps) {
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  // While the payment is in flight the cache already shows it as paid; keep
  // the form on the pre-payment bills so it doesn't reshuffle or vanish.
  const [frozenBills, setFrozenBills] = useState<Bill[] | null>(null);
  const visibleBills = frozenBills ?? bills;

  const unpaidBills = useMemo(
    () => unpaidBillsOldestFirst(visibleBills),
    [visibleBills],
  );
  const outstanding = roundCurrency(
    unpaidBills.reduce((sum, item) => sum + item.balance, 0),
  );
  const oldestBalance = unpaidBills[0]?.balance ?? 0;
  const statementPeriod = formatStatementPeriodCompact(
    billingMonthToDateInput(unpaidBills[0]?.billingMonth ?? ""),
    billingMonthToDateInput(unpaidBills.at(-1)?.billingMonth ?? ""),
  );

  useEffect(() => {
    if (!open) return;
    // Prefer plain numeric text so "Proceed" stays enabled without comma-parse issues.
    setPaymentDate(manilaToday());
    setAmount(oldestBalance > 0 ? oldestBalance.toFixed(2) : "");
    setMethod("bank");
    setReference("");
    setError(null);
  }, [open, oldestBalance]);

  useEffect(() => {
    if (!open) setFrozenBills(null);
  }, [open]);

  const paymentAmount = readSheetNumber(amount);
  const amountInvalid = paymentAmount <= 0;
  const carryOverCredit = roundCurrency(Math.max(0, paymentAmount - outstanding));

  const allocations = useMemo(
    () =>
      amountInvalid ? [] : allocatePaymentAcrossBills(unpaidBills, paymentAmount),
    [amountInvalid, unpaidBills, paymentAmount],
  );

  const mutation = usePayBalanceMutation();
  const isPending = mutation.isPending;

  // A pending payment can't be abandoned silently — its error would be lost.
  const requestClose = () => {
    if (!isPending) onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isPending]);

  const canSubmit =
    allocations.length > 0 && Boolean(toManilaDate(paymentDate)) && !isPending;

  if (!open || unpaidBills.length === 0) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const paymentDay = toManilaDate(paymentDate);
    if (!canSubmit || !paymentDay) {
      setError("Enter a valid payment amount.");
      return;
    }

    setFrozenBills(visibleBills);
    mutation.mutate(
      {
        room: unpaidBills[0].room,
        amount: roundCurrency(paymentAmount),
        paymentDate: paymentDay,
        method,
        reference: reference.trim(),
      },
      {
        onSuccess: () => {
          setFrozenBills(null);
          onSuccess();
          onClose();
        },
        onError: (err) => {
          setFrozenBills(null);
          if (isCommittedFailure(err)) {
            onSuccess();
            onClose();
            return;
          }
          setError(err.message);
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-balance-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
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
            onClick={requestClose}
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
              className={dateInputClass}
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
            {allocations.length > 0 && (
              <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Applied to (oldest first)
                </p>
                <ul className="mt-1 space-y-0.5">
                  {allocations.map((item) => (
                    <li
                      key={item.bill.id}
                      className="flex items-center justify-between gap-3 text-xs text-navy"
                    >
                      <span>{formatMonthLabel(item.bill.billingMonth)}</span>
                      <span>
                        {formatPesoDecimal(item.amount)}{" "}
                        <span
                          className={
                            item.status === "Paid"
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-amber-600"
                          }
                        >
                          {item.status === "Paid"
                            ? "Paid"
                            : `Partial (${formatPesoDecimal(
                                roundCurrency(item.bill.totalDue - item.newPaid),
                              )} left)`}
                        </span>
                      </span>
                    </li>
                  ))}
                  {carryOverCredit > 0 && (
                    <li className="flex items-center justify-between gap-3 border-t border-gray-200 pt-1 text-xs text-navy">
                      <span>Carry over (credit for next bill)</span>
                      <span className="font-semibold text-blue-600">
                        {formatPesoDecimal(carryOverCredit)}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}
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
              Reference (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transaction ID / reference number"
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
              disabled={isPending}
              className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <ButtonSpinner />
              ) : (
                <CreditCard className="h-4 w-4" aria-hidden />
              )}
              {isPending ? "Processing…" : "Proceed to Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
