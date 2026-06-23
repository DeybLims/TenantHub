import { Droplet, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { formatExpenseAmount } from "@/lib/format";
import {
  formatRate,
  formatUsage,
  type UtilityDistributionSummary,
} from "@/lib/utilityDistributionSummary";

interface UtilityAnalyticsPanelProps {
  summary: UtilityDistributionSummary;
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
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}

function ProfitBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex overflow-hidden rounded-md">
      <div className="flex flex-1 items-center bg-emerald-50 px-3 py-2.5 text-xs font-bold uppercase text-navy">
        {label}
      </div>
      <div className="flex min-w-[88px] items-center justify-center bg-brand-emerald px-3 py-2.5 text-sm font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function AnalyticsBlock({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      {children}
    </section>
  );
}

export function UtilityAnalyticsPanel({ summary }: UtilityAnalyticsPanelProps) {
  return (
    <article className="rounded-xl bg-surface-card shadow-card">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-navy">
          Calculated Analytics & Distribution
        </h2>
      </div>

      <div className="space-y-4 px-6 py-6">
        <AnalyticsBlock>
          <BlockHeader
            title="Electricity (Meralco)"
            icon={<Zap className="h-4 w-4 text-amber-700" aria-hidden />}
            iconClassName="bg-amber-100"
          />
          <AnalyticsRow
            label="Selling Rate"
            value={`${formatRate(summary.avgElecRate)} /kWh`}
          />
          <AnalyticsRow
            label="JJC Consumption"
            value={`${formatUsage(summary.totalElecUsage)} kWh`}
          />
          <AnalyticsRow
            label="Total Tenant Billed"
            value={formatExpenseAmount(summary.totalElecBill)}
          />
          <AnalyticsRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(summary.totalElecBill)}
          />
          <ProfitBar
            label="Net Electricity Profit"
            value={formatExpenseAmount(summary.totalElecBill)}
          />
        </AnalyticsBlock>

        <AnalyticsBlock>
          <BlockHeader
            title="Water (MIWD)"
            icon={<Droplet className="h-4 w-4 text-sky-700" aria-hidden />}
            iconClassName="bg-sky-100"
          />
          <AnalyticsRow
            label="Standard Base Rate"
            value={`${formatRate(summary.avgWaterRate)} /m3`}
          />
          <AnalyticsRow
            label="Residential Base"
            value={formatExpenseAmount(summary.residentialWaterBill)}
          />
          <AnalyticsRow
            label="Commercial Base"
            value={formatExpenseAmount(summary.commercialWaterBill)}
          />
          <AnalyticsRow
            label="Standard Base Revenue"
            value={formatExpenseAmount(summary.totalWaterBill)}
          />
          <AnalyticsRow
            label="True Tenant Cost"
            value={formatExpenseAmount(summary.totalWaterBill)}
          />
          <ProfitBar
            label="Net Water Profit"
            value={formatExpenseAmount(summary.totalWaterBill)}
          />
        </AnalyticsBlock>
      </div>
    </article>
  );
}
