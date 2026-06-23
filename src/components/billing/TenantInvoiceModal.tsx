"use client";

import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPreviousMeterReadings,
  isCurrentReadingBelowPrevious,
} from "@/lib/billingMeters";
import { hasBillForRoomMonth } from "@/lib/buildBillingRows";
import {
  billingMonthToDateInput,
  formatMonthLabel,
  resolveBillingMonthValue,
} from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { generateBill } from "@/services/api";
import {
  DEFAULT_ELECTRICITY_RATE,
  type GenerateBillPayload,
} from "@/types/billing";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

interface TenantInvoiceModalProps {
  open: boolean;
  selectedMonth: string;
  tenants: TenantRecord[];
  billingRows: SheetRow[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TenantInvoiceModal({
  open,
  selectedMonth,
  tenants,
  billingRows,
  onClose,
  onSuccess,
}: TenantInvoiceModalProps) {
  const activeTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.Status === "Active")
        .sort((a, b) => a.Room - b.Room),
    [tenants],
  );

  const [unitCode, setUnitCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [elecPrev, setElecPrev] = useState("");
  const [elecCurr, setElecCurr] = useState("");
  const [waterPrev, setWaterPrev] = useState("");
  const [waterCurr, setWaterCurr] = useState("");
  const [otherCharges, setOtherCharges] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [electricitySpecial, setElectricitySpecial] = useState(false);
  const [electricityRate, setElectricityRate] = useState<number>(
    DEFAULT_ELECTRICITY_RATE,
  );
  const [waterSpecial, setWaterSpecial] = useState(false);

  const elecCurrRef = useRef<HTMLInputElement>(null);

  const selectedTenant = activeTenants.find(
    (tenant) => tenant.UnitCode === unitCode,
  );

  const billingMonthForCheck = billingDate || selectedMonth;

  const isDuplicate = useMemo(() => {
    if (!selectedTenant || !billingMonthForCheck) return false;
    return hasBillForRoomMonth(
      billingRows,
      selectedTenant.Room,
      billingMonthForCheck,
    );
  }, [billingRows, billingMonthForCheck, selectedTenant]);

  const billingMonthLabel = formatMonthLabel(billingMonthForCheck);
  const formLocked = isDuplicate;

  useEffect(() => {
    if (!open) return;
    const initialDate = billingMonthToDateInput(selectedMonth);
    setUnitCode("");
    setTenantName("");
    setBillingDate(initialDate);
    setDueDate(initialDate);
    setBaseRent("");
    setElecPrev("");
    setElecCurr("");
    setWaterPrev("");
    setWaterCurr("");
    setOtherCharges("0");
    setAmountPaid("0");
    setNotes("");
    setError(null);
    setElectricitySpecial(false);
    setElectricityRate(DEFAULT_ELECTRICITY_RATE);
    setWaterSpecial(false);
  }, [open, selectedMonth]);

  useEffect(() => {
    if (!selectedTenant) return;

    setTenantName(selectedTenant.Name);
    setBaseRent(String(selectedTenant.Rent));
    setElecCurr("");
    setWaterCurr("");

    const { ePrev, wPrev } = getPreviousMeterReadings(
      billingRows,
      selectedTenant.Room,
    );
    setElecPrev(String(ePrev));
    setWaterPrev(String(wPrev));

    if (
      !hasBillForRoomMonth(
        billingRows,
        selectedTenant.Room,
        billingDate || selectedMonth,
      )
    ) {
      requestAnimationFrame(() => {
        elecCurrRef.current?.focus();
      });
    }
  }, [selectedTenant, billingRows, selectedMonth, billingDate]);

  const activeElectricityRate = useMemo(() => {
    if (!electricitySpecial) return DEFAULT_ELECTRICITY_RATE;
    const rate = Number(electricityRate);
    return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_ELECTRICITY_RATE;
  }, [electricityRate, electricitySpecial]);

  const activeWaterRate = useMemo(() => (waterSpecial ? 45 : 30), [waterSpecial]);

  const elecUsage = useMemo(() => {
    const usage = readSheetNumber(elecCurr) - readSheetNumber(elecPrev);
    return Math.max(0, usage);
  }, [elecCurr, elecPrev]);

  const waterUsage = useMemo(() => {
    const usage = readSheetNumber(waterCurr) - readSheetNumber(waterPrev);
    return Math.max(0, usage);
  }, [waterCurr, waterPrev]);

  const calculatedElecBill = useMemo(
    () => elecUsage * activeElectricityRate,
    [activeElectricityRate, elecUsage],
  );

  const calculatedWaterBill = useMemo(
    () => waterUsage * activeWaterRate,
    [activeWaterRate, waterUsage],
  );

  const totalDue = useMemo(() => {
    return (
      readSheetNumber(baseRent) +
      calculatedElecBill +
      calculatedWaterBill +
      readSheetNumber(otherCharges)
    );
  }, [baseRent, calculatedElecBill, calculatedWaterBill, otherCharges]);

  const balance = useMemo(() => {
    return totalDue - readSheetNumber(amountPaid);
  }, [amountPaid, totalDue]);

  const elecReadingInvalid = isCurrentReadingBelowPrevious(elecCurr, elecPrev);
  const waterReadingInvalid = isCurrentReadingBelowPrevious(waterCurr, waterPrev);
  const hasReadingErrors = elecReadingInvalid || waterReadingInvalid;

  const invalidInputClass =
    "border-amber-500 focus:border-amber-500 focus:ring-amber-500/20";

  const lockedInputClass = formLocked
    ? "cursor-not-allowed bg-gray-100 opacity-60"
    : "";

  const mutation = useMutation({
    mutationFn: (payload: GenerateBillPayload) => generateBill(payload),
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

    if (!billingMonthForCheck) {
      setError("Set a billing date for this invoice.");
      return;
    }

    if (!selectedTenant) {
      setError("Select a unit code.");
      return;
    }

    const eCurrNum = readSheetNumber(elecCurr);
    const wCurrNum = readSheetNumber(waterCurr);

    if (eCurrNum < 0 || wCurrNum < 0) {
      setError("Enter valid meter readings.");
      return;
    }

    if (hasReadingErrors) {
      setError("Current readings cannot be lower than previous readings.");
      return;
    }

    if (isDuplicate) {
      setError(
        `A billing record for Room ${selectedTenant.Room} already exists for ${billingMonthLabel}.`,
      );
      return;
    }

    const existingMonths = billingRows.map((row) => row.Month);
    const monthForApi = resolveBillingMonthValue(
      existingMonths,
      billingMonthForCheck,
      selectedMonth,
    );

    mutation.mutate({
      month: monthForApi,
      room: String(selectedTenant.Room),
      rent: readSheetNumber(baseRent),
      ePrev: readSheetNumber(elecPrev),
      eCurr: eCurrNum,
      eRate: activeElectricityRate,
      wPrev: readSheetNumber(waterPrev),
      wCurr: wCurrNum,
      wRate: activeWaterRate,
      adjustment: readSheetNumber(otherCharges),
    });
  };

  const toggleBase =
    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30";
  const toggleKnob =
    "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-invoice-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-card">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 id="tenant-invoice-title" className="text-lg font-bold text-navy">
            Tenant Invoice
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
          <FloatingLabelField label="Unit Code">
            <select
              value={unitCode}
              onChange={(event) => setUnitCode(event.target.value)}
              className={floatingInputClass}
              required
            >
              <option value="">Select unit…</option>
              {activeTenants.map((tenant) => (
                <option key={tenant.Room} value={tenant.UnitCode}>
                  {tenant.UnitCode}
                </option>
              ))}
            </select>
          </FloatingLabelField>

          <FloatingLabelField label="Tenant Name">
            <input
              type="text"
              value={tenantName}
              readOnly
              className={`${floatingInputClass} bg-gray-50`}
            />
          </FloatingLabelField>

          {isDuplicate && selectedTenant && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              role="alert"
            >
              ⚠️ Invoice Denied: A billing record for Room {selectedTenant.Room}{" "}
              has already been generated for {billingMonthLabel}.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FloatingLabelField label="Billing Date">
              <input
                type="date"
                value={billingDate}
                onChange={(event) => setBillingDate(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
          </div>

          <p className="text-sm font-bold text-navy">Charges</p>

          <FloatingLabelField label="Base Rent">
            <input
              type="number"
              value={baseRent}
              readOnly
              onChange={(event) => setBaseRent(event.target.value)}
              placeholder="Value"
              className={`${floatingInputClass} bg-gray-50`}
            />
          </FloatingLabelField>

          <div>
            <div className="flex items-end gap-3">
              <div className="grid flex-1 grid-cols-3 gap-2">
                <FloatingLabelField label="Electricity Bill">
                  <input
                    type="text"
                    readOnly
                    value={calculatedElecBill.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    placeholder="Value"
                    className={`${floatingInputClass} bg-gray-50`}
                  />
                </FloatingLabelField>
                <FloatingLabelField label="Previous Reading">
                  <input
                    type="number"
                    value={elecPrev}
                    readOnly
                    onChange={(event) => setElecPrev(event.target.value)}
                    placeholder="Value"
                    className={`${floatingInputClass} bg-gray-50`}
                  />
                </FloatingLabelField>
                <FloatingLabelField label="Current Reading">
                  <input
                    ref={elecCurrRef}
                    type="number"
                    min={0}
                    step="any"
                    value={elecCurr}
                    disabled={formLocked}
                    onChange={(event) => setElecCurr(event.target.value)}
                    placeholder="Value"
                    className={`${floatingInputClass} ${lockedInputClass} ${
                      elecReadingInvalid ? invalidInputClass : ""
                    }`}
                    aria-invalid={elecReadingInvalid}
                  />
                </FloatingLabelField>
              </div>

              <div className="flex flex-col items-end gap-1 pb-1">
                <span className="text-[11px] font-medium text-gray-500">
                  Special Rate
                </span>
                <button
                  type="button"
                  onClick={() => setElectricitySpecial((s) => !s)}
                  className={`${toggleBase} ${
                    electricitySpecial ? "bg-brand-blue" : "bg-gray-200"
                  }`}
                  aria-pressed={electricitySpecial}
                >
                  <span
                    className={`${toggleKnob} ${
                      electricitySpecial ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
                {electricitySpecial && (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={String(electricityRate)}
                    onChange={(event) =>
                      setElectricityRate(Number(event.target.value))
                    }
                    className="mt-1 w-[92px] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    aria-label="Electricity special rate"
                  />
                )}
              </div>
            </div>
            {elecReadingInvalid && (
              <p className="mt-1 text-xs text-amber-700">
                Current reading cannot be lower than previous reading.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-end gap-3">
              <div className="grid flex-1 grid-cols-3 gap-2">
                <FloatingLabelField label="Water Bill">
                  <input
                    type="text"
                    readOnly
                    value={calculatedWaterBill.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    placeholder="Value"
                    className={`${floatingInputClass} bg-gray-50`}
                  />
                </FloatingLabelField>
                <FloatingLabelField label="Previous Reading">
                  <input
                    type="number"
                    value={waterPrev}
                    readOnly
                    onChange={(event) => setWaterPrev(event.target.value)}
                    placeholder="Value"
                    className={`${floatingInputClass} bg-gray-50`}
                  />
                </FloatingLabelField>
                <FloatingLabelField label="Current Reading">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={waterCurr}
                    disabled={formLocked}
                    onChange={(event) => setWaterCurr(event.target.value)}
                    placeholder="Value"
                    className={`${floatingInputClass} ${lockedInputClass} ${
                      waterReadingInvalid ? invalidInputClass : ""
                    }`}
                    aria-invalid={waterReadingInvalid}
                  />
                </FloatingLabelField>
              </div>

              <div className="flex flex-col items-end gap-1 pb-1">
                <span className="text-[11px] font-medium text-gray-500">
                  Special Rate
                </span>
                <button
                  type="button"
                  onClick={() => setWaterSpecial((s) => !s)}
                  className={`${toggleBase} ${
                    waterSpecial ? "bg-brand-blue" : "bg-gray-200"
                  }`}
                  aria-pressed={waterSpecial}
                >
                  <span
                    className={`${toggleKnob} ${
                      waterSpecial ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="mt-1 text-[11px] font-medium text-gray-500">
                  ₱{activeWaterRate.toFixed(0)} / m³
                </span>
              </div>
            </div>
            {waterReadingInvalid && (
              <p className="mt-1 text-xs text-amber-700">
                Current reading cannot be lower than previous reading.
              </p>
            )}
          </div>

          <FloatingLabelField label="Other Charges">
            <input
              type="number"
              value={otherCharges}
              disabled={formLocked}
              onChange={(event) => setOtherCharges(event.target.value)}
              placeholder="Value"
              className={`${floatingInputClass} ${lockedInputClass}`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Total Due">
            <input
              type="text"
              readOnly
              value={totalDue.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              placeholder="Value"
              className={`${floatingInputClass} bg-gray-100 font-bold`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Amount Paid">
            <input
              type="number"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              placeholder="Value"
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Balance">
            <input
              type="text"
              readOnly
              value={balance.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              placeholder="Value"
              className={`${floatingInputClass} ${
                balance > 0 ? "text-red-600" : "text-emerald-700"
              }`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Notes">
            <textarea
              value={notes}
              disabled={formLocked}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add notes here..."
              className={`${floatingInputClass} ${lockedInputClass} resize-none`}
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
              className="rounded-lg bg-brand-coral px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || hasReadingErrors || isDuplicate}
              className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
