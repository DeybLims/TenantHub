import type { ReactNode } from "react";
import { Droplet, Zap } from "lucide-react";
import { formatExpenseAmount } from "@/lib/format";
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
    <div className="mb-4 flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </span>
      <h3 className="text-sm font-bold text-navy">{title}</h3>
    </div>
  );
}

function AnalyticsRow({
  label,
  value,
  emphasize = false,
  alignRight = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-gray-50 py-2.5 text-sm last:border-0 ${
        emphasize ? "rounded-lg bg-blue-50/60 px-3 font-semibold" : ""
      }`}
    >
      <span className={emphasize ? "text-navy" : "text-gray-600"}>{label}</span>
      <span
        className={`min-w-[112px] tabular-nums ${
          alignRight || emphasize ? "text-right" : ""
        } font-medium text-navy ${emphasize ? "text-base font-bold" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ProfitBar({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  const positive = amount >= 0;
  const absolute = formatExpenseAmount(Math.abs(amount));
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-emerald-100">
      <div className="flex items-stretch">
        <div className="flex flex-1 items-center bg-gradient-to-r from-emerald-50 to-emerald-100/70 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy">
          {label}
        </div>
        <div
          className={`flex min-w-[112px] items-center justify-center px-4 py-3 text-sm font-bold text-white ${
            positive ? "bg-emerald-400" : "bg-red-500"
          }`}
        >
          {positive ? "+" : "−"}
          {absolute}
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
            label="JJC Consumption"
            value={formatExpenseAmount(derived.jjcCalculatedAmount)}
          />
          <AnalyticsRow
            label="Apartment Consumption"
            value={formatExpenseAmount(derived.apartmentCalculatedAmount)}
          />
          <AnalyticsRow
            label="Motor Power Usage"
            value={formatExpenseAmount(derived.motorCalculatedAmount)}
          />
          <AnalyticsRow
            label="Paid Tenant Billed"
            value={formatExpenseAmount(analytics.paidTenantBilled)}
            emphasize
            alignRight
          />
          <AnalyticsRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.tenantElectricityTrueCost)}
          />
          <ProfitBar
            label="NET ELECTRICITY PROFIT"
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
            label="Residential Base"
            value={formatExpenseAmount(derived.miwdResidentialAmount)}
          />
          <AnalyticsRow
            label="Commercial Base"
            value={formatExpenseAmount(derived.miwdCommercialAmount)}
          />
          <AnalyticsRow
            label="Pumped Water Charge"
            value={formatExpenseAmount(derived.pumpedWaterAmount)}
          />
          <AnalyticsRow
            label="Paid Tenant Billed"
            value={formatExpenseAmount(analytics.tenantWaterRevenue)}
            emphasize
            alignRight
          />
          <AnalyticsRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.trueTenantWaterCost)}
          />
          <ProfitBar
            label="NET WATER PROFIT"
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
