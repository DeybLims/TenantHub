"use client";

import { useMutation } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
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
import {
  calcConsumption,
  ELECTRICITY_SELLING_RATE,
  getWaterSellingRate,
  isCorrectionMonth,
  roundCurrency,
} from "@/lib/propertyBillingCalculations";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { generateBill } from "@/services/api";
import type { GenerateBillPayload } from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

interface InvoiceModalProps {
  open: boolean;
  selectedMonth: string;
  tenants: TenantRecord[];
  billingRows: SheetRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const readOnlyClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-navy";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1 block text-xs font-medium text-gray-500">
      {children}
    </label>
  );
}

function CurrencyInput({
  label,
  value,
  onChange,
  readOnly = false,
  disabled = false,
  valueClass = "",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
          ₱
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          className={`${readOnly ? readOnlyClass : inputClass} pl-8 text-right ${valueClass}`}
        />
      </div>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1 pb-1">
      <span className="text-[10px] font-medium text-gray-500">Special Rate</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? "bg-blue-500" : "bg-gray-200"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function InvoiceModal({
  open,
  selectedMonth,
  tenants,
  billingRows,
  onClose,
  onSuccess,
}: InvoiceModalProps) {
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
  const [electricitySpecial, setElectricitySpecial] = useState(false);
  const [electricityRate, setElectricityRate] = useState(ELECTRICITY_SELLING_RATE);
  const [error, setError] = useState<string | null>(null);

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
    setElectricitySpecial(false);
    setElectricityRate(ELECTRICITY_SELLING_RATE);
    setError(null);
  }, [open, selectedMonth]);

  useEffect(() => {
    if (!selectedTenant) return;

    setTenantName(selectedTenant.Name);
    setBaseRent(
      selectedTenant.Rent.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
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
      requestAnimationFrame(() => elecCurrRef.current?.focus());
    }
  }, [selectedTenant, billingRows, selectedMonth, billingDate]);

  const allowNegativeConsumption = isCorrectionMonth(billingMonthForCheck);

  const activeElectricityRate = electricitySpecial
    ? electricityRate
    : ELECTRICITY_SELLING_RATE;

  const activeWaterRate = useMemo(() => {
    if (!selectedTenant) return 45;
    return getWaterSellingRate(selectedTenant.Room, billingMonthForCheck);
  }, [selectedTenant, billingMonthForCheck]);

  const calculatedElecBill = useMemo(() => {
    const usage = calcConsumption(
      readSheetNumber(elecPrev),
      readSheetNumber(elecCurr),
      allowNegativeConsumption,
    );
    return roundCurrency(usage * activeElectricityRate);
  }, [activeElectricityRate, elecCurr, elecPrev, allowNegativeConsumption]);

  const calculatedWaterBill = useMemo(() => {
    const usage = calcConsumption(
      readSheetNumber(waterPrev),
      readSheetNumber(waterCurr),
      allowNegativeConsumption,
    );
    return roundCurrency(usage * activeWaterRate);
  }, [activeWaterRate, waterCurr, waterPrev, allowNegativeConsumption]);

  const totalDue = useMemo(
    () =>
      readSheetNumber(baseRent) +
      calculatedElecBill +
      calculatedWaterBill +
      readSheetNumber(otherCharges),
    [baseRent, calculatedElecBill, calculatedWaterBill, otherCharges],
  );

  const balance = totalDue - readSheetNumber(amountPaid);

  const elecReadingInvalid =
    !allowNegativeConsumption &&
    isCurrentReadingBelowPrevious(elecCurr, elecPrev);
  const waterReadingInvalid =
    !allowNegativeConsumption &&
    isCurrentReadingBelowPrevious(waterCurr, waterPrev);
  const hasReadingErrors = elecReadingInvalid || waterReadingInvalid;

  const mutation = useMutation({
    mutationFn: (payload: GenerateBillPayload) => generateBill(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  const formatAmount = (value: number) =>
    value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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

    const monthForApi = resolveBillingMonthValue(
      billingRows.map((row) => row.Month),
      billingMonthForCheck,
      selectedMonth,
    );

    mutation.mutate({
      month: monthForApi,
      room: String(selectedTenant.Room),
      rent: readSheetNumber(baseRent),
      ePrev: readSheetNumber(elecPrev),
      eCurr: readSheetNumber(elecCurr),
      eRate: activeElectricityRate,
      wPrev: readSheetNumber(waterPrev),
      wCurr: readSheetNumber(waterCurr),
      wRate: activeWaterRate,
      adjustment: readSheetNumber(otherCharges),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-card">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 id="invoice-modal-title" className="text-lg font-bold text-navy">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Unit Code</FieldLabel>
              <select
                value={unitCode}
                onChange={(event) => setUnitCode(event.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select unit…</option>
                {activeTenants.map((tenant) => (
                  <option key={tenant.Room} value={tenant.UnitCode}>
                    {tenant.UnitCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Tenant Name</FieldLabel>
              <input
                type="text"
                value={tenantName}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <FieldLabel>Billing Date</FieldLabel>
              <div className="relative">
                <input
                  type="date"
                  value={billingDate}
                  onChange={(event) => setBillingDate(event.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <FieldLabel>Due Date</FieldLabel>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {isDuplicate && selectedTenant && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              Invoice denied: Room {selectedTenant.Room} already has a bill for{" "}
              {billingMonthLabel}.
            </div>
          )}

          <p className="text-sm font-bold text-navy">Charges</p>

          <CurrencyInput label="Base Rent" value={baseRent} readOnly />

          <div>
            <div className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-3 gap-2">
                <CurrencyInput
                  label="Electricity"
                  value={formatAmount(calculatedElecBill)}
                  readOnly
                />
                <div>
                  <FieldLabel>Previous</FieldLabel>
                  <input
                    type="text"
                    readOnly
                    value={elecPrev}
                    className={readOnlyClass}
                  />
                </div>
                <div>
                  <FieldLabel>Current</FieldLabel>
                  <input
                    ref={elecCurrRef}
                    type="number"
                    min={0}
                    step="any"
                    value={elecCurr}
                    disabled={formLocked}
                    onChange={(event) => setElecCurr(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <ToggleSwitch
                enabled={electricitySpecial}
                onChange={setElectricitySpecial}
              />
            </div>
            {electricitySpecial && (
              <input
                type="number"
                min={0}
                step="any"
                value={electricityRate}
                onChange={(event) =>
                  setElectricityRate(Number(event.target.value) || ELECTRICITY_SELLING_RATE)
                }
                className={`${inputClass} mt-2`}
                aria-label="Electricity special rate"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <CurrencyInput
              label="Water"
              value={formatAmount(calculatedWaterBill)}
              readOnly
            />
            <div>
              <FieldLabel>Previous</FieldLabel>
              <input type="text" readOnly value={waterPrev} className={readOnlyClass} />
            </div>
            <div>
              <FieldLabel>Current</FieldLabel>
              <input
                type="number"
                min={0}
                step="any"
                value={waterCurr}
                disabled={formLocked}
                onChange={(event) => setWaterCurr(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <CurrencyInput
            label="Other Charges"
            value={otherCharges}
            onChange={setOtherCharges}
            disabled={formLocked}
          />

          <div className="space-y-4 border-t border-gray-200 pt-4">
            <CurrencyInput
              label="Total Due"
              value={formatAmount(totalDue)}
              readOnly
              valueClass="font-bold"
            />
            <CurrencyInput
              label="Amount Paid"
              value={amountPaid}
              onChange={setAmountPaid}
            />
            <CurrencyInput
              label="Balance"
              value={formatAmount(balance)}
              readOnly
              valueClass={balance > 0 ? "font-bold text-red-500" : "text-emerald-600"}
            />

            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={notes}
                disabled={formLocked}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add notes here..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || hasReadingErrors || isDuplicate}
              className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
