"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { useGenerateBillMutation } from "@/hooks/useBillingMutations";
import { isCommittedFailure } from "@/lib/billingErrors";
import {
  getPreviousMeterReadings,
  isCurrentReadingBelowPrevious,
} from "@/lib/billingMeters";
import { hasBillForRoomMonth } from "@/lib/buildBillingRows";
import { formatLongDate } from "@/lib/format";
import { manilaMonthKey, manilaToday } from "@/lib/manilaTime";
import {
  buildBillsForRoom,
  tenantOccupancyFromDate,
} from "@/lib/mapBillingViewModel";
import {
  billingMonthKey,
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
  WATER_RATE_STANDARD,
} from "@/lib/propertyBillingCalculations";
import { readSheetNumber } from "@/lib/readSheetNumber";
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

const dateInputClass = inputClass;

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
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1 pb-1">
      <span className="text-[10px] font-medium text-gray-500">Special Rate</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

function billingDatesForMonth(selectedMonth: string): {
  billingDate: string;
  dueDate: string;
} {
  const base = billingMonthToDateInput(selectedMonth) || manilaToday();
  const date = new Date(`${base}T12:00:00`);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    billingDate: `${year}-${pad(monthIndex + 1)}-15`,
    dueDate: `${year}-${pad(monthIndex + 1)}-20`,
  };
}

export function InvoiceModal({
  open,
  selectedMonth,
  tenants: liveTenants,
  billingRows: liveBillingRows,
  onClose,
  onSuccess,
}: InvoiceModalProps) {
  // While saving, the cache already contains the optimistic bill; read the
  // pre-submit data so the form doesn't flip to "Invoice denied" mid-save.
  const [frozenData, setFrozenData] = useState<{
    tenants: TenantRecord[];
    billingRows: SheetRow[];
  } | null>(null);
  const tenants = frozenData?.tenants ?? liveTenants;
  const billingRows = frozenData?.billingRows ?? liveBillingRows;

  const activeTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.Status === "Active")
        .sort((a, b) => a.Room - b.Room),
    [tenants],
  );

  const [unitCode, setUnitCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  /** Billing period as YYYY-MM (independent of the billing/due dates). */
  const [billingMonth, setBillingMonth] = useState("");
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
  const [waterSpecial, setWaterSpecial] = useState(false);
  const [waterRate, setWaterRate] = useState(WATER_RATE_STANDARD);
  const [error, setError] = useState<string | null>(null);

  const elecCurrRef = useRef<HTMLInputElement>(null);

  const selectedTenant = activeTenants.find(
    (tenant) => tenant.UnitCode === unitCode,
  );

  const billingMonthForCheck = billingMonth ? `${billingMonth}-01` : "";

  const isDuplicate = useMemo(() => {
    if (!selectedTenant || !billingMonthForCheck) return false;
    return hasBillForRoomMonth(
      billingRows,
      selectedTenant.Room,
      billingMonthForCheck,
    );
  }, [billingRows, billingMonthForCheck, selectedTenant]);

  const billingMonthLabel = formatMonthLabel(billingMonthForCheck);

  // Bills before move-in are hidden on the Billing page, so billing an earlier
  // month requires moving the tenant's move-in back to that month.
  const occupancyFrom = tenantOccupancyFromDate(selectedTenant);
  const isBeforeMoveIn =
    Boolean(billingMonth && occupancyFrom) &&
    billingMonth < billingMonthKey(occupancyFrom);
  const [backdateMoveIn, setBackdateMoveIn] = useState(false);
  useEffect(() => {
    setBackdateMoveIn(false);
  }, [billingMonth, unitCode]);

  // A previous reading of 0 bills the whole meter value as one month's usage —
  // only correct for a room's very first bill, so it must be confirmed.
  const zeroPreviousReadings = selectedTenant
    ? [
        readSheetNumber(elecPrev) === 0 ? "electricity" : "",
        readSheetNumber(waterPrev) === 0 ? "water" : "",
      ].filter(Boolean)
    : [];
  const needsZeroReadingConfirm = zeroPreviousReadings.length > 0;
  const zeroReadingKey = zeroPreviousReadings.join("+");
  const [zeroReadingConfirmed, setZeroReadingConfirmed] = useState(false);
  useEffect(() => {
    setZeroReadingConfirmed(false);
  }, [billingMonth, unitCode, zeroReadingKey]);

  useEffect(() => {
    if (!open) {
      setFrozenData(null);
      return;
    }
    const initialMonth = billingMonthKey(selectedMonth) || manilaMonthKey();
    const { billingDate: autoBillingDate, dueDate: autoDueDate } =
      billingDatesForMonth(initialMonth);
    setUnitCode("");
    setTenantName("");
    setBillingMonth(initialMonth);
    setBillingDate(autoBillingDate);
    setDueDate(autoDueDate);
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
    setWaterSpecial(false);
    setWaterRate(WATER_RATE_STANDARD);
    setError(null);
  }, [open, selectedMonth]);

  // Load tenant defaults only when the selected room changes — not when
  // billingDate/billingRows flicker, which was wiping Current readings mid-type.
  const selectedRoom = selectedTenant?.Room;
  useEffect(() => {
    if (!open || !selectedTenant || selectedRoom == null) return;

    setTenantName(selectedTenant.Name);
    setElectricitySpecial(false);
    setElectricityRate(ELECTRICITY_SELLING_RATE);
    setWaterSpecial(false);
    setWaterRate(getWaterSellingRate(selectedTenant.Room, billingMonthForCheck));
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
      billingMonthForCheck,
    );
    setElecPrev(String(ePrev));
    setWaterPrev(String(wPrev));

    requestAnimationFrame(() => elecCurrRef.current?.focus());
    // intentionally omit billingRows/billingMonth — room change only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- room-scoped reset
  }, [open, selectedRoom]);

  const handleBillingMonthChange = (value: string) => {
    setBillingMonth(value);
    if (!value) return;
    const dates = billingDatesForMonth(value);
    setBillingDate(dates.billingDate);
    setDueDate(dates.dueDate);
    if (selectedTenant) {
      const { ePrev, wPrev } = getPreviousMeterReadings(
        billingRows,
        selectedTenant.Room,
        `${value}-01`,
      );
      setElecPrev(String(ePrev));
      setWaterPrev(String(wPrev));
    }
  };

  useEffect(() => {
    if (!selectedTenant) return;
    setWaterRate((current) => {
      const next = getWaterSellingRate(
        selectedTenant.Room,
        billingMonthForCheck,
      );
      if (!waterSpecial) return next;
      return current;
    });
  }, [selectedTenant, billingMonthForCheck, waterSpecial]);

  const allowNegativeConsumption = isCorrectionMonth(billingMonthForCheck);

  const baseWaterRate = selectedTenant
    ? getWaterSellingRate(selectedTenant.Room, billingMonthForCheck)
    : WATER_RATE_STANDARD;

  const calculatedElecBill = useMemo(() => {
    // Empty current = not entered yet → show ₱0 (avoid May correction treating "" as 0 reading).
    if (elecCurr.trim() === "") return 0;
    const usage = calcConsumption(
      readSheetNumber(elecPrev),
      readSheetNumber(elecCurr),
      allowNegativeConsumption,
    );
    return roundCurrency(usage * electricityRate);
  }, [electricityRate, elecCurr, elecPrev, allowNegativeConsumption]);

  const calculatedWaterBill = useMemo(() => {
    if (waterCurr.trim() === "") return 0;
    const usage = calcConsumption(
      readSheetNumber(waterPrev),
      readSheetNumber(waterCurr),
      allowNegativeConsumption,
    );
    return roundCurrency(usage * waterRate);
  }, [waterRate, waterCurr, waterPrev, allowNegativeConsumption]);

  const totalDue = useMemo(
    () =>
      readSheetNumber(baseRent) +
      calculatedElecBill +
      calculatedWaterBill +
      readSheetNumber(otherCharges),
    [baseRent, calculatedElecBill, calculatedWaterBill, otherCharges],
  );

  // Unpaid balance from this occupant's earlier bills — Amount Paid clears it first.
  const previousBalance = useMemo(() => {
    if (!selectedTenant) return 0;
    const bills = buildBillsForRoom(
      billingRows,
      tenants,
      selectedTenant.Room,
      tenantOccupancyFromDate(selectedTenant) || undefined,
    );
    return roundCurrency(bills.reduce((sum, bill) => sum + bill.balance, 0));
  }, [billingRows, tenants, selectedTenant]);

  const totalOwed = roundCurrency(previousBalance + totalDue);
  const paidNow = readSheetNumber(amountPaid);
  const paidToNewBill = roundCurrency(
    Math.min(totalDue, Math.max(0, paidNow - previousBalance)),
  );
  const tenantCredit = selectedTenant?.Credit ?? 0;
  const creditToApply = roundCurrency(
    Math.min(tenantCredit, Math.max(0, totalDue - paidToNewBill)),
  );
  const carryOverCredit = roundCurrency(Math.max(0, paidNow - totalOwed));
  const balance = roundCurrency(
    Math.max(0, totalOwed - paidNow - creditToApply),
  );

  const elecReadingInvalid =
    !allowNegativeConsumption &&
    isCurrentReadingBelowPrevious(elecCurr, elecPrev);
  const waterReadingInvalid =
    !allowNegativeConsumption &&
    isCurrentReadingBelowPrevious(waterCurr, waterPrev);
  const hasReadingErrors = elecReadingInvalid || waterReadingInvalid;

  const mutation = useGenerateBillMutation();
  const isPending = mutation.isPending;

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
      setError("Select the billing month for this invoice.");
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
    if (isBeforeMoveIn && !backdateMoveIn) {
      setError(
        `${billingMonthLabel} is before ${selectedTenant.UnitCode}'s move-in date. Tick the box to move the move-in date back first.`,
      );
      return;
    }
    if (needsZeroReadingConfirm && !zeroReadingConfirmed) {
      setError("Confirm the previous reading of 0 before saving.");
      return;
    }

    const monthForApi = resolveBillingMonthValue(
      billingRows.map((row) => row.Month),
      billingMonthForCheck,
      selectedMonth,
    );

    setFrozenData({ tenants, billingRows });
    mutation.mutate({
      month: monthForApi,
      room: String(selectedTenant.Room),
      rent: readSheetNumber(baseRent),
      ePrev: readSheetNumber(elecPrev),
      eCurr: readSheetNumber(elecCurr),
      eRate: electricityRate,
      wPrev: readSheetNumber(waterPrev),
      wCurr: readSheetNumber(waterCurr),
      wRate: waterRate,
      adjustment: readSheetNumber(otherCharges),
      billingDate: billingDate || undefined,
      dueDate: dueDate || undefined,
      paid: readSheetNumber(amountPaid),
      notes: notes.trim() || undefined,
      moveInDate: isBeforeMoveIn ? billingMonthForCheck : undefined,
    }, {
      onSuccess: () => {
        setFrozenData(null);
        onSuccess();
        onClose();
      },
      onError: (err) => {
        setFrozenData(null);
        // The bill exists despite the failed step — the toast says what to fix.
        if (isCommittedFailure(err)) {
          onSuccess();
          onClose();
          return;
        }
        setError(err.message);
      },
    });
  };

  const requestClose = () => {
    if (!isPending) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-card">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 id="invoice-modal-title" className="text-lg font-bold text-navy">
            Tenant Invoice
          </h2>
          <button
            type="button"
            onClick={requestClose}
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
            <div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel>Billing Month</FieldLabel>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(event) =>
                    handleBillingMonthChange(event.target.value)
                  }
                  className={dateInputClass}
                  required
                />
              </div>
              <div>
                <FieldLabel>Billing Date</FieldLabel>
                <input
                  type="date"
                  value={billingDate}
                  onChange={(event) => setBillingDate(event.target.value)}
                  className={dateInputClass}
                />
              </div>
              <div>
                <FieldLabel>Due Date</FieldLabel>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={dateInputClass}
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
              {billingMonthLabel}. Choose a different billing month to create a
              new invoice.
            </div>
          )}

          {isBeforeMoveIn && !isDuplicate && selectedTenant && (
            <div
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p>
                {selectedTenant.UnitCode}&apos;s move-in date is{" "}
                <span className="font-semibold">
                  {formatLongDate(selectedTenant.MoveIn || selectedTenant.LeaseStart)}
                </span>
                , so a {billingMonthLabel} bill would be hidden on the Billing
                page.
              </p>
              <label className="flex cursor-pointer items-start gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={backdateMoveIn}
                  onChange={(event) => setBackdateMoveIn(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-500 focus:ring-blue-500/20"
                />
                Change move-in date to{" "}
                {formatLongDate(billingMonthForCheck)} and create this bill
              </label>
            </div>
          )}

          {needsZeroReadingConfirm && !isDuplicate && selectedTenant && (
            <div
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p>
                The previous{" "}
                <span className="font-semibold">
                  {zeroPreviousReadings.join(" and ")}
                </span>{" "}
                reading is 0, so the full current meter value will be billed as
                one month&apos;s usage. This is only correct for{" "}
                {selectedTenant.UnitCode}&apos;s very first bill.
              </p>
              <label className="flex cursor-pointer items-start gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={zeroReadingConfirmed}
                  onChange={(event) =>
                    setZeroReadingConfirmed(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-500 focus:ring-blue-500/20"
                />
                This is the room&apos;s first bill — a previous reading of 0 is
                correct
              </label>
            </div>
          )}

          <p className="text-sm font-bold text-navy">Charges</p>

          <CurrencyInput
            label="Base Rent"
            value={baseRent}
            onChange={setBaseRent}
          />

          <div>
            <div className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-4 gap-2">
                <CurrencyInput
                  label="Electricity"
                  value={formatAmount(calculatedElecBill)}
                  readOnly
                />
                <div>
                  <FieldLabel>Previous</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={elecPrev}
                    onChange={(event) => setElecPrev(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Current</FieldLabel>
                  <input
                    ref={elecCurrRef}
                    type="text"
                    inputMode="decimal"
                    value={elecCurr}
                    onChange={(event) => setElecCurr(event.target.value)}
                    placeholder="Enter reading"
                    className={`${inputClass} ${elecReadingInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                </div>
                <div>
                  <FieldLabel>Rate</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(electricityRate)}
                    placeholder={String(ELECTRICITY_SELLING_RATE)}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      const rate = Number.isFinite(next)
                        ? next
                        : ELECTRICITY_SELLING_RATE;
                      setElectricityRate(rate);
                      setElectricitySpecial(rate !== ELECTRICITY_SELLING_RATE);
                    }}
                    className={inputClass}
                    aria-label="Electricity rate"
                  />
                </div>
              </div>
              <ToggleSwitch
                enabled={electricitySpecial}
                onChange={(enabled) => {
                  setElectricitySpecial(enabled);
                  if (!enabled) {
                    setElectricityRate(ELECTRICITY_SELLING_RATE);
                  }
                }}
              />
            </div>
            {elecReadingInvalid && (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                Current electricity reading cannot be lower than previous (
                {elecPrev}). Enter a higher reading or use a correction month.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-4 gap-2">
                <CurrencyInput
                  label="Water"
                  value={formatAmount(calculatedWaterBill)}
                  readOnly
                />
                <div>
                  <FieldLabel>Previous</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={waterPrev}
                    onChange={(event) => setWaterPrev(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Current</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={waterCurr}
                    onChange={(event) => setWaterCurr(event.target.value)}
                    placeholder="Enter reading"
                    className={`${inputClass} ${waterReadingInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                </div>
                <div>
                  <FieldLabel>Rate</FieldLabel>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(waterRate)}
                    placeholder={String(baseWaterRate)}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      const rate = Number.isFinite(next) ? next : baseWaterRate;
                      setWaterRate(rate);
                      setWaterSpecial(rate !== baseWaterRate);
                    }}
                    className={inputClass}
                    aria-label="Water rate"
                  />
                </div>
              </div>
              <ToggleSwitch
                enabled={waterSpecial}
                onChange={(enabled) => {
                  setWaterSpecial(enabled);
                  if (!enabled) {
                    setWaterRate(baseWaterRate);
                  }
                }}
              />
            </div>
            {waterReadingInvalid && (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                Current water reading cannot be lower than previous ({waterPrev}
                ). Enter a higher reading or use a correction month.
              </p>
            )}
          </div>

          <CurrencyInput
            label="Other Charges"
            value={otherCharges}
            onChange={setOtherCharges}
          />

          <div className="space-y-4 border-t border-gray-200 pt-4">
            <CurrencyInput
              label="Total Due This Month"
              value={formatAmount(totalDue)}
              readOnly
              valueClass="font-bold"
            />
            {previousBalance > 0 && (
              <>
                <CurrencyInput
                  label="Previous Balance"
                  value={formatAmount(previousBalance)}
                  readOnly
                  valueClass="text-red-500"
                />
                <CurrencyInput
                  label="Total Amount Owed"
                  value={formatAmount(totalOwed)}
                  readOnly
                  valueClass="font-bold"
                />
              </>
            )}
            <CurrencyInput
              label="Amount Paid"
              value={amountPaid}
              onChange={setAmountPaid}
            />
            {previousBalance > 0 && paidNow > 0 && (
              <p className="-mt-2 text-xs text-gray-500">
                Applied to the previous balance first (oldest bill first), then
                to this bill.
              </p>
            )}
            {creditToApply > 0 && (
              <p className="-mt-2 text-xs text-blue-600">
                Tenant credit of ₱{formatAmount(creditToApply)} will be applied
                to this bill.
              </p>
            )}
            {carryOverCredit > 0 && (
              <p className="-mt-2 text-xs text-blue-600">
                ₱{formatAmount(carryOverCredit)} over the amount owed will be
                carried over as credit for the next bill.
              </p>
            )}
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
              disabled={isPending}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                hasReadingErrors ||
                isDuplicate ||
                (isBeforeMoveIn && !backdateMoveIn) ||
                (needsZeroReadingConfirm && !zeroReadingConfirmed)
              }
              className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending && <ButtonSpinner className="mr-1.5" />}
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
