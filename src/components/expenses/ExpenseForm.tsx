"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import type {
  ExpenseRecord,
  UtilityExpenseDerived,
} from "@/components/expenses/types";
import {
  allocateRemainingConsumption,
  consumptionMismatch,
  type ConsumptionTouched,
} from "@/lib/utilityConsumptionAllocation";
import { roundCurrency } from "@/lib/propertyBillingCalculations";

interface ExpenseFormProps {
  record: ExpenseRecord;
  derived: UtilityExpenseDerived;
  onRecordChange: (patch: Partial<ExpenseRecord>) => void;
  onCancel: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  isDirty?: boolean;
}

const inputClass = `${floatingInputClass} text-navy`;

const EMPTY_TOUCHED: ConsumptionTouched = { a: false, b: false, c: false };

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="border-b border-gray-100 pb-2 text-sm font-bold text-navy">
      {children}
    </h3>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder = "Enter Value",
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <FloatingLabelField label={label}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="any"
          value={value || ""}
          placeholder={placeholder}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className={`${inputClass} ${unit ? "pr-14" : ""}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
            {unit}
          </span>
        )}
      </div>
      {hint ? (
        <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </FloatingLabelField>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  readOnly = false,
  highlight = false,
  placeholder = "0.00",
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  highlight?: boolean;
  placeholder?: string;
}) {
  return (
    <FloatingLabelField label={label}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          ₱
        </span>
        <input
          type="number"
          min={0}
          step="any"
          readOnly={readOnly}
          value={value || ""}
          placeholder={placeholder}
          onChange={(event) => onChange?.(Number(event.target.value) || 0)}
          className={`${inputClass} pl-8 text-right ${readOnly ? "cursor-default bg-blue-50/80 font-semibold text-blue-700" : ""} ${highlight && !readOnly ? "bg-blue-50/80" : ""} ${highlight && readOnly ? "bg-blue-50/80" : ""}`}
        />
      </div>
    </FloatingLabelField>
  );
}

function formatRatePreview(rate: number, unit: string): string {
  if (rate <= 0) return "";
  return `Current rate: ₱${rate.toFixed(2)}/${unit}`;
}

export function ExpenseForm({
  record,
  derived,
  onRecordChange,
  onCancel,
  onSave,
  onExportPdf,
  isDirty = false,
}: ExpenseFormProps) {
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [elecTouched, setElecTouched] =
    useState<ConsumptionTouched>(EMPTY_TOUCHED);
  const [waterTouched, setWaterTouched] =
    useState<ConsumptionTouched>(EMPTY_TOUCHED);

  useEffect(() => {
    if (isDirty) setShowSavedToast(false);
  }, [isDirty]);

  useEffect(() => {
    if (!showSavedToast) return;
    const timer = window.setTimeout(() => setShowSavedToast(false), 3500);
    return () => window.clearTimeout(timer);
  }, [showSavedToast]);

  // Reset touch tracking when the billing month (loaded record) changes.
  useEffect(() => {
    setElecTouched({
      a: record.jjcConsumptionKwh > 0,
      b: record.apartmentConsumptionKwh > 0,
      c: record.motorConsumptionKwh > 0,
    });
    setWaterTouched({
      a: record.miwdResidentialM3 > 0,
      b: record.miwdCommercialM3 > 0,
      c: record.pumpedWaterChargeM3 > 0,
    });
    // Only re-seed when month identity changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.billingMonth]);

  const handleSave = () => {
    onSave();
    setShowSavedToast(true);
  };

  const applyElecParts = (
    total: number,
    parts: { a: number; b: number; c: number },
    touched: ConsumptionTouched,
  ) => {
    const allocated =
      total > 0
        ? allocateRemainingConsumption(total, parts, touched)
        : parts;
    onRecordChange({
      meralcoTotalConsumptionKwh: total,
      jjcConsumptionKwh: allocated.a,
      apartmentConsumptionKwh: allocated.b,
      motorConsumptionKwh: allocated.c,
    });
  };

  const applyWaterParts = (
    total: number,
    parts: { a: number; b: number; c: number },
    touched: ConsumptionTouched,
  ) => {
    const allocated =
      total > 0
        ? allocateRemainingConsumption(total, parts, touched)
        : parts;
    onRecordChange({
      miwdTotalConsumptionM3: total,
      miwdResidentialM3: allocated.a,
      miwdCommercialM3: allocated.b,
      pumpedWaterChargeM3: allocated.c,
    });
  };

  const handleElecTotalChange = (total: number) => {
    applyElecParts(
      total,
      {
        a: record.jjcConsumptionKwh,
        b: record.apartmentConsumptionKwh,
        c: record.motorConsumptionKwh,
      },
      elecTouched,
    );
  };

  const handleElecPartChange = (
    key: keyof ConsumptionTouched,
    value: number,
  ) => {
    const nextTouched: ConsumptionTouched = {
      ...elecTouched,
      // Clearing a field releases it back to auto-allocation.
      [key]: value > 0,
    };
    setElecTouched(nextTouched);
    applyElecParts(
      record.meralcoTotalConsumptionKwh,
      {
        a: key === "a" ? value : record.jjcConsumptionKwh,
        b: key === "b" ? value : record.apartmentConsumptionKwh,
        c: key === "c" ? value : record.motorConsumptionKwh,
      },
      nextTouched,
    );
  };

  const handleWaterTotalChange = (total: number) => {
    applyWaterParts(
      total,
      {
        a: record.miwdResidentialM3,
        b: record.miwdCommercialM3,
        c: record.pumpedWaterChargeM3,
      },
      waterTouched,
    );
  };

  const handleWaterPartChange = (
    key: keyof ConsumptionTouched,
    value: number,
  ) => {
    const nextTouched: ConsumptionTouched = {
      ...waterTouched,
      [key]: value > 0,
    };
    setWaterTouched(nextTouched);
    applyWaterParts(
      record.miwdTotalConsumptionM3,
      {
        a: key === "a" ? value : record.miwdResidentialM3,
        b: key === "b" ? value : record.miwdCommercialM3,
        c: key === "c" ? value : record.pumpedWaterChargeM3,
      },
      nextTouched,
    );
  };

  const elecPartsSum = roundCurrency(
    record.jjcConsumptionKwh +
      record.apartmentConsumptionKwh +
      record.motorConsumptionKwh,
  );
  const elecMismatch =
    record.meralcoTotalConsumptionKwh > 0
      ? consumptionMismatch(record.meralcoTotalConsumptionKwh, {
          a: record.jjcConsumptionKwh,
          b: record.apartmentConsumptionKwh,
          c: record.motorConsumptionKwh,
        })
      : 0;

  const waterMismatch =
    record.miwdTotalConsumptionM3 > 0
      ? consumptionMismatch(record.miwdTotalConsumptionM3, {
          a: record.miwdResidentialM3,
          b: record.miwdCommercialM3,
          c: record.pumpedWaterChargeM3,
        })
      : 0;

  const elecRatePreview =
    record.electricityChargeRate > 0
      ? record.electricityChargeRate
      : derived.meralcoTrueRate;
  const waterRatePreview =
    record.waterChargeRate > 0 ? record.waterChargeRate : derived.miwdTrueRate;

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {showSavedToast && (
        <div
          className="fixed bottom-6 right-6 z-[120] flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-navy">Changes saved</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Utility expenses for this month were updated successfully.
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-navy">
          Utility Expenses & Distribution
        </h2>
      </div>

      <div className="space-y-8 px-6 py-6">
        <section className="space-y-4">
          <SectionTitle>Electricity — Meralco</SectionTitle>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4">
              <NumberField
                label="Electricity Consumption"
                value={record.meralcoTotalConsumptionKwh}
                onChange={handleElecTotalChange}
                unit="kWh"
                hint={
                  elecPartsSum > 0
                    ? `JJC + Tenant + Motor = ${elecPartsSum.toFixed(2)} kWh`
                    : undefined
                }
              />
              <NumberField
                label="Electricity Charge Rate"
                value={record.electricityChargeRate}
                onChange={(value) =>
                  onRecordChange({ electricityChargeRate: value })
                }
                unit="₱/kWh"
                placeholder={
                  elecRatePreview > 0
                    ? elecRatePreview.toFixed(2)
                    : "Enter Value"
                }
                hint={formatRatePreview(elecRatePreview, "kWh")}
              />
              <NumberField
                label="JJC Consumption"
                value={record.jjcConsumptionKwh}
                onChange={(value) => handleElecPartChange("a", value)}
                unit="kWh"
              />
              <NumberField
                label="Tenant Consumption"
                value={record.apartmentConsumptionKwh}
                onChange={(value) => handleElecPartChange("b", value)}
                unit="kWh"
              />
              <NumberField
                label="Motor Consumption"
                value={record.motorConsumptionKwh}
                onChange={(value) => handleElecPartChange("c", value)}
                unit="kWh"
              />
              {Math.abs(elecMismatch) > 0.01 && (
                <p className="text-xs font-medium text-amber-600">
                  Parts differ from total by {elecMismatch > 0 ? "+" : ""}
                  {elecMismatch.toFixed(2)} kWh. Clear a part to auto-fill the
                  remainder.
                </p>
              )}
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <CurrencyField
                label="Meralco Master Bill Amount"
                value={record.meralcoBillAmount}
                onChange={(value) =>
                  onRecordChange({ meralcoBillAmount: value })
                }
                highlight
                placeholder={
                  derived.computedMeralcoMasterBill > 0 &&
                  record.meralcoBillAmount <= 0
                    ? derived.computedMeralcoMasterBill.toFixed(2)
                    : "Enter master bill"
                }
              />
              <CurrencyField
                label="Amount Paid This Month"
                value={record.meralcoPaidThisMonth}
                onChange={(value) =>
                  onRecordChange({ meralcoPaidThisMonth: value })
                }
                highlight
                placeholder="0.00"
              />
              <CurrencyField
                label="Balance"
                value={derived.meralcoBalance}
                readOnly
                highlight
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Water — MIWD</SectionTitle>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4">
              <NumberField
                label="Water Consumption"
                value={record.miwdTotalConsumptionM3}
                onChange={handleWaterTotalChange}
                unit="m³"
                hint={
                  record.miwdResidentialM3 +
                    record.miwdCommercialM3 +
                    record.pumpedWaterChargeM3 >
                  0
                    ? `Residential + Commercial + Pumped = ${roundCurrency(
                        record.miwdResidentialM3 +
                          record.miwdCommercialM3 +
                          record.pumpedWaterChargeM3,
                      ).toFixed(2)} m³`
                    : undefined
                }
              />
              <NumberField
                label="Water Charge Rate"
                value={record.waterChargeRate}
                onChange={(value) => onRecordChange({ waterChargeRate: value })}
                unit="₱/m³"
                placeholder={
                  waterRatePreview > 0
                    ? waterRatePreview.toFixed(2)
                    : "Enter Value"
                }
                hint={formatRatePreview(waterRatePreview, "m³")}
              />
              <NumberField
                label="Residential Base"
                value={record.miwdResidentialM3}
                onChange={(value) => handleWaterPartChange("a", value)}
                unit="m³"
              />
              <NumberField
                label="Commercial Base"
                value={record.miwdCommercialM3}
                onChange={(value) => handleWaterPartChange("b", value)}
                unit="m³"
              />
              <NumberField
                label="Pumped Water Charge"
                value={record.pumpedWaterChargeM3}
                onChange={(value) => handleWaterPartChange("c", value)}
                unit="m³"
              />
              {Math.abs(waterMismatch) > 0.01 && (
                <p className="text-xs font-medium text-amber-600">
                  Parts differ from total by {waterMismatch > 0 ? "+" : ""}
                  {waterMismatch.toFixed(2)} m³. Clear a part to auto-fill the
                  remainder.
                </p>
              )}
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <CurrencyField
                label="MIWD Master Bill Amount"
                value={record.miwdBillAmount}
                onChange={(value) => onRecordChange({ miwdBillAmount: value })}
                highlight
                placeholder={
                  derived.computedMiwdMasterBill > 0 && record.miwdBillAmount <= 0
                    ? derived.computedMiwdMasterBill.toFixed(2)
                    : "Enter master bill"
                }
              />
              <CurrencyField
                label="Amount Paid This Month"
                value={record.miwdPaidThisMonth}
                onChange={(value) =>
                  onRecordChange({ miwdPaidThisMonth: value })
                }
                highlight
                placeholder="0.00"
              />
              <CurrencyField
                label="Balance"
                value={derived.miwdBalance}
                readOnly
                highlight
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        {showSavedToast && (
          <p className="mr-auto text-sm font-medium text-emerald-600">
            Changes saved
          </p>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={!isDirty}
          className="text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          {showSavedToast && !isDirty ? "Saved" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Export to PDF
        </button>
      </div>
    </article>
  );
}
