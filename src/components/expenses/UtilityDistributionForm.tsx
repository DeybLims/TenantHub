import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import { formatExpenseAmount } from "@/lib/format";
import {
  formatRate,
  formatUsage,
  type UtilityDistributionSummary,
} from "@/lib/utilityDistributionSummary";
import { formatMonthLabel } from "@/lib/months";

interface UtilityDistributionFormProps {
  summary: UtilityDistributionSummary;
  selectedMonth: string;
}

const readOnlyClass = `${floatingInputClass} cursor-default bg-gray-50 text-navy`;

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
      {children}
    </h3>
  );
}

function UnitField({
  label,
  value,
  unit,
  className = "",
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <FloatingLabelField label={label} className={className}>
      <div className="relative">
        <input type="text" readOnly value={value} className={readOnlyClass} />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {unit}
          </span>
        )}
      </div>
    </FloatingLabelField>
  );
}

export function UtilityDistributionForm({
  summary,
  selectedMonth,
}: UtilityDistributionFormProps) {
  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <article className="rounded-xl bg-surface-card shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-navy">
          Utility Expenses & Distribution
        </h2>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          {summary.tenantCount} tenant{summary.tenantCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-8 px-6 py-6">
        <UnitField label="Date" value={monthLabel} />

        <section className="space-y-4">
          <SectionTitle>Tenant Electricity (Meralco)</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UnitField
              label="Total Billed to Tenants"
              value={formatExpenseAmount(summary.totalElecBill)}
            />
            <UnitField
              label="Total Consumption"
              value={formatUsage(summary.totalElecUsage)}
              unit="kWh"
            />
            <UnitField
              label="Average Rate"
              value={formatRate(summary.avgElecRate)}
              unit="/kWh"
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Tenant Water (MIWD)</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UnitField
              label="Residential Total"
              value={formatExpenseAmount(summary.residentialWaterBill)}
            />
            <UnitField
              label="Commercial Total"
              value={formatExpenseAmount(summary.commercialWaterBill)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UnitField
              label="Total Consumption"
              value={formatUsage(summary.totalWaterUsage)}
              unit="m³"
            />
            <UnitField
              label="Average Rate"
              value={formatRate(summary.avgWaterRate)}
              unit="/m³"
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Combined Tenant Utilities</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UnitField
              label="Electricity Total"
              value={formatExpenseAmount(summary.totalElecBill)}
            />
            <UnitField
              label="Water Total"
              value={formatExpenseAmount(summary.totalWaterBill)}
            />
            <UnitField
              label="Grand Total"
              value={formatExpenseAmount(summary.combinedUtilities)}
            />
          </div>
        </section>
      </div>
    </article>
  );
}
