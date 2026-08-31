"use client";

import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import type {
  ExpenseRecord,
  UtilityExpenseDerived,
} from "@/components/expenses/types";

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
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}) {
  return (
    <FloatingLabelField label={label}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="any"
          value={value || ""}
          placeholder="Enter Value"
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className={`${inputClass} ${unit ? "pr-14" : ""}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
            {unit}
          </span>
        )}
      </div>
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

export function ExpenseForm({
  record,
  derived,
  onRecordChange,
  onCancel,
  onSave,
  onExportPdf,
  isDirty = false,
}: ExpenseFormProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
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
                label="JJC Consumption"
                value={record.jjcConsumptionKwh}
                onChange={(value) => onRecordChange({ jjcConsumptionKwh: value })}
                unit="kWh"
              />
              <NumberField
                label="Apartment Consumption"
                value={record.apartmentConsumptionKwh}
                onChange={(value) =>
                  onRecordChange({ apartmentConsumptionKwh: value })
                }
                unit="kWh"
              />
              <NumberField
                label="Motor Power Usage"
                value={record.motorConsumptionKwh}
                onChange={(value) =>
                  onRecordChange({ motorConsumptionKwh: value })
                }
                unit="kWh"
              />
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <CurrencyField
                label="Meralco Master Bill Amount"
                value={derived.computedMeralcoMasterBill}
                readOnly
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
                label="Residential Base"
                value={record.miwdResidentialM3}
                onChange={(value) => onRecordChange({ miwdResidentialM3: value })}
                unit="m³"
              />
              <NumberField
                label="Commercial Base"
                value={record.miwdCommercialM3}
                onChange={(value) => onRecordChange({ miwdCommercialM3: value })}
                unit="m³"
              />
              <NumberField
                label="Pumped Water Charge"
                value={record.pumpedWaterChargeM3}
                onChange={(value) =>
                  onRecordChange({ pumpedWaterChargeM3: value })
                }
                unit="m³"
              />
            </div>
            <div className="space-y-4 border-t border-gray-200 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <CurrencyField
                label="MIWD Master Bill Amount"
                value={derived.computedMiwdMasterBill}
                readOnly
              />
              <CurrencyField
                label="Amount Paid This Month"
                value={record.miwdPaidThisMonth}
                onChange={(value) => onRecordChange({ miwdPaidThisMonth: value })}
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
