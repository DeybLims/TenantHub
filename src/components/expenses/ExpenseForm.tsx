"use client";

import { Calendar, ChevronDown } from "lucide-react";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import { formatMonthLabel } from "@/lib/months";
import type { MonthOption } from "@/types/dashboard";
import type {
  ExpenseRecord,
  UtilityExpenseDerived,
} from "@/components/expenses/types";

interface ExpenseFormProps {
  record: ExpenseRecord;
  selectedMonth: string;
  monthOptions: MonthOption[];
  derived: UtilityExpenseDerived;
  onRecordChange: (patch: Partial<ExpenseRecord>) => void;
  onMonthChange: (month: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  isDirty?: boolean;
}

const inputClass = `${floatingInputClass} text-navy`;

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
      {children}
    </h3>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  readOnly = false,
  className = "",
}: {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  unit?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <FloatingLabelField label={label} className={className}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="any"
          readOnly={readOnly}
          value={value || ""}
          onChange={(event) => onChange?.(Number(event.target.value) || 0)}
          className={`${inputClass} ${readOnly ? "cursor-default bg-gray-50" : ""} ${unit ? "pr-14" : ""}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
    </FloatingLabelField>
  );
}

function RateDisplay({
  label,
  value,
  unit,
  className = "",
}: {
  label: string;
  value: number;
  unit: string;
  className?: string;
}) {
  return (
    <FloatingLabelField label={label} className={className}>
      <input
        type="text"
        readOnly
        value={value > 0 ? `${value.toFixed(2)} ${unit}` : ""}
        placeholder="Value"
        className={`${inputClass} cursor-default bg-gray-50`}
      />
    </FloatingLabelField>
  );
}

export function ExpenseForm({
  record,
  selectedMonth,
  monthOptions,
  derived,
  onRecordChange,
  onMonthChange,
  onCancel,
  onSave,
  onExportPdf,
  isDirty = false,
}: ExpenseFormProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-navy">
          Utility Expenses & Distribution
        </h2>
        <button
          type="button"
          onClick={() => onRecordChange({ paidToUtility: !record.paidToUtility })}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            record.paidToUtility
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          <span aria-hidden>{record.paidToUtility ? "🟢" : "🔴"}</span>
          {record.paidToUtility ? "Paid" : "Unpaid"}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </button>
      </div>

      <div className="space-y-6 px-6 py-6">
        <FloatingLabelField label="Date">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              className={`${inputClass} appearance-none pr-10`}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Calendar
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
          </div>
          {selectedMonth && (
            <p className="mt-1 text-xs text-gray-400">
              {formatMonthLabel(selectedMonth)}
            </p>
          )}
        </FloatingLabelField>

        <section className="space-y-3">
          <SectionTitle>JJC Consumption</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              label="Previous Reading"
              value={record.jjcPreviousReading}
              onChange={(value) =>
                onRecordChange({ jjcPreviousReading: value })
              }
              unit="kWh"
            />
            <NumberField
              label="Current Reading"
              value={record.jjcCurrentReading}
              onChange={(value) =>
                onRecordChange({ jjcCurrentReading: value })
              }
              unit="kWh"
            />
            <FloatingLabelField label="Calculated Amount">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  ₱
                </span>
                <input
                  type="text"
                  readOnly
                  value={
                    derived.jjcCalculatedAmount > 0
                      ? derived.jjcCalculatedAmount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ""
                  }
                  placeholder="Auto"
                  className={`${inputClass} cursor-default bg-gray-50 pl-8`}
                />
              </div>
            </FloatingLabelField>
          </div>
          {derived.jjcConsumption > 0 && (
            <p className="text-xs text-gray-500">
              Consumption:{" "}
              <span className="font-semibold text-navy">
                {derived.jjcConsumption.toLocaleString("en-PH")} kWh
              </span>
              {derived.meralcoTrueRate > 0 && (
                <>
                  {" "}
                  × True Rate{" "}
                  <span className="font-semibold text-navy">
                    ₱{derived.meralcoTrueRate.toFixed(2)}
                  </span>
                </>
              )}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle>Meralco Master Bill</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField
              label="Master Bill Amount"
              value={record.meralcoBillAmount}
              onChange={(value) => onRecordChange({ meralcoBillAmount: value })}
            />
            <NumberField
              label="Total Consumption"
              value={record.meralcoConsumption}
              onChange={(value) => onRecordChange({ meralcoConsumption: value })}
              unit="kWh"
            />
            <RateDisplay
              label="True Rate"
              value={derived.meralcoTrueRate}
              unit="/kWh"
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Metro Iloilo Water District (MIWD)</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Residential Base"
              value={record.miwdResidential}
              onChange={(value) => onRecordChange({ miwdResidential: value })}
            />
            <NumberField
              label="Commercial Base"
              value={record.miwdCommercial}
              onChange={(value) => onRecordChange({ miwdCommercial: value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Total Consumption"
              value={record.miwdConsumption}
              onChange={(value) => onRecordChange({ miwdConsumption: value })}
              unit="m³"
            />
            <RateDisplay
              label="True Rate"
              value={derived.miwdTrueRate}
              unit="/m³"
            />
          </div>
          <NumberField
            label="Special Water Rate"
            value={record.miwdSpecialRate}
            onChange={(value) => onRecordChange({ miwdSpecialRate: value })}
            unit="/m³"
          />
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
          onClick={onSave}
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Save Changes
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
