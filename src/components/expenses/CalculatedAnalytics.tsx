import type { ReactNode } from "react";
import { Droplet, Zap } from "lucide-react";
import { formatExpenseAmount, formatPesoDecimal } from "@/lib/format";
import { formatRate, formatUsage } from "@/lib/utilityDistributionSummary";
import type { UtilityExpenseAnalytics } from "@/components/expenses/types";

interface CalculatedAnalyticsProps {
  analytics: UtilityExpenseAnalytics;
}

function BlockHeader({
  title,
  icon,
  iconClassName,
}: {
  title: string;
  icon: ReactNode;
  iconClassName: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </span>
      <h3 className="text-sm font-bold text-navy">{title}</h3>
    </div>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="text-right font-medium text-navy">{value}</span>
    </div>
  );
}

function ProfitBar({
  label,
  value,
  amount,
}: {
  label: string;
  value: string;
  amount: number;
}) {
  const positive = amount >= 0;
  return (
    <div className="mt-4 flex overflow-hidden rounded-md">
      <div className="flex flex-1 items-center bg-emerald-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-navy">
        {label}
      </div>
      <div
        className={`flex min-w-[100px] items-center justify-center px-3 py-2.5 text-sm font-bold text-white ${
          positive ? "bg-emerald-400" : "bg-red-500"
        }`}
      >
        {positive ? "+" : ""}
        {value}
      </div>
    </div>
  );
}

function AnalyticsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      {children}
    </section>
  );
}

export function CalculatedAnalytics({ analytics }: CalculatedAnalyticsProps) {
  const { derived } = analytics;

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-navy">
          Calculated Analytics & Distribution
        </h2>
      </div>

      <div className="space-y-4 px-6 py-6">
        <AnalyticsCard>
          <BlockHeader
            title="Electricity (Meralco)"
            icon={<Zap className="h-4 w-4 text-amber-700" aria-hidden />}
            iconClassName="bg-amber-100"
          />
          <AnalyticsRow
            label="Selling Rate"
            value={`${formatRate(derived.electricitySellingRate)} /kWh`}
          />
          <AnalyticsRow
            label="JJC Consumption"
            value={`${formatUsage(derived.jjcConsumption)} kWh`}
          />
          <AnalyticsRow
            label="Total Tenant Billed"
            value={formatExpenseAmount(analytics.tenantTotalBilled)}
          />
          <AnalyticsRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.tenantElectricityTrueCost)}
          />
          <ProfitBar
            label="Net Electricity Profit"
            value={formatPesoDecimal(analytics.netElectricityProfit)}
            amount={analytics.netElectricityProfit}
          />
        </AnalyticsCard>

        <AnalyticsCard>
          <BlockHeader
            title="Water (MIWD)"
            icon={<Droplet className="h-4 w-4 text-sky-700" aria-hidden />}
            iconClassName="bg-sky-100"
          />
          <AnalyticsRow
            label="Standard Base Rate"
            value={`${formatRate(derived.miwdTrueRate)} /m³`}
          />
          <AnalyticsRow
            label="Residential Base"
            value={formatExpenseAmount(analytics.miwdResidentialAmount)}
          />
          <AnalyticsRow
            label="Commercial Base"
            value={formatExpenseAmount(analytics.miwdCommercialAmount)}
          />
          <AnalyticsRow
            label="Standard Base Revenue"
            value={formatExpenseAmount(analytics.tenantWaterRevenue)}
          />
          <AnalyticsRow
            label="True Tenant Cost"
            value={formatExpenseAmount(analytics.trueTenantWaterCost)}
          />
          <ProfitBar
            label="Net Water Profit"
            value={formatPesoDecimal(analytics.netWaterProfit)}
            amount={analytics.netWaterProfit}
          />
        </AnalyticsCard>

        {analytics.warnings.length > 0 && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Meter reading warnings</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {analytics.warnings.map((warning) => (
                <li key={`${warning.room}-${warning.utility}`}>
                  Room {warning.room} {warning.utility}: negative delta (
                  {warning.delta})
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
