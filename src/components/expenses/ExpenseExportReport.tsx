import type { ReactNode } from "react";
import { Droplet, FileText, KeyRound, Zap } from "lucide-react";
import {
  formatExpenseAmount,
  formatPesoDecimal,
} from "@/lib/format";
import { formatMonthLabel } from "@/lib/months";
import type {
  ExpenseRecord,
  UtilityExpenseAnalytics,
  UtilityExpenseDerived,
} from "@/components/expenses/types";

export interface ExpenseExportReportProps {
  selectedMonth: string;
  record: ExpenseRecord;
  derived: UtilityExpenseDerived;
  analytics: UtilityExpenseAnalytics;
  generatedAt?: Date;
}

function SummaryRow({
  label,
  value,
  valueClass = "text-navy",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-blue-100/80 py-2 text-sm last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function SectionBanner({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 break-inside-avoid">
      <div className="mb-3 flex items-center gap-2 rounded-t-md bg-blue-500 px-4 py-2.5 text-white">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function ExpenseExportReport({
  selectedMonth,
  record,
  derived,
  analytics,
  generatedAt = new Date(),
}: ExpenseExportReportProps) {
  const monthLabel = formatMonthLabel(selectedMonth) || selectedMonth || "—";
  const timestamp = generatedAt.toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const combinedNet = analytics.netElectricityProfit + analytics.netWaterProfit;

  return (
    <div
      id="expense-export-report"
      className="mx-auto max-w-[900px] bg-white px-8 py-10 text-navy"
    >
      <header className="mb-8 border-b-2 border-blue-500 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500 text-white">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-blue-500">
                TenantHub
              </p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold tracking-[0.08em] text-blue-500">
              EXPENSE REPORT
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Generated on {timestamp}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy">
            Utility Expenses & Distribution
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Master utility bills, true rates, and tenant distribution
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3 text-right">
          <p className="text-xs font-medium text-gray-500">Billing Month</p>
          <p className="mt-0.5 font-bold text-blue-600">{monthLabel}</p>
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600">
          Summary for Selected Month
        </h3>
        <SummaryRow
          label="Meralco Master Bill"
          value={formatExpenseAmount(record.meralcoBillAmount)}
        />
        <SummaryRow
          label="MIWD Master Bill"
          value={formatExpenseAmount(record.miwdBillAmount)}
        />
        <SummaryRow
          label="Net Electricity Profit"
          value={formatPesoDecimal(analytics.netElectricityProfit)}
          valueClass={
            analytics.netElectricityProfit >= 0
              ? "text-emerald-600"
              : "text-red-500"
          }
        />
        <SummaryRow
          label="Net Water Profit"
          value={formatPesoDecimal(analytics.netWaterProfit)}
          valueClass={
            analytics.netWaterProfit >= 0 ? "text-emerald-600" : "text-red-500"
          }
        />
        <SummaryRow
          label="Combined Net Profit"
          value={formatPesoDecimal(combinedNet)}
          valueClass={combinedNet >= 0 ? "text-emerald-600" : "text-red-500"}
        />
      </section>

      <SectionBanner
        title="Electricity (Meralco)"
        icon={<Zap className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <SummaryRow
            label="JJC Consumption"
            value={formatExpenseAmount(derived.jjcCalculatedAmount)}
          />
          <SummaryRow
            label="Tenant Consumption"
            value={formatExpenseAmount(derived.apartmentCalculatedAmount)}
          />
          <SummaryRow
            label="Motor Consumption"
            value={formatExpenseAmount(derived.motorCalculatedAmount)}
          />
          <SummaryRow
            label="Paid Tenant Billed"
            value={formatExpenseAmount(analytics.paidTenantBilled)}
            valueClass="text-right text-base font-bold text-navy"
          />
          <SummaryRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.tenantElectricityTrueCost)}
          />
        </div>
      </SectionBanner>

      <SectionBanner
        title="Water (MIWD)"
        icon={<Droplet className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <SummaryRow
            label="Residential Base"
            value={formatExpenseAmount(derived.miwdResidentialAmount)}
          />
          <SummaryRow
            label="Commercial Base"
            value={formatExpenseAmount(derived.miwdCommercialAmount)}
          />
          <SummaryRow
            label="Pumped Water Charge"
            value={formatExpenseAmount(derived.pumpedWaterAmount)}
          />
          <SummaryRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.trueTenantWaterCost)}
          />
        </div>
      </SectionBanner>

      <SectionBanner
        title="Master Utility Inputs"
        icon={<FileText className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryRow
            label="Meralco Paid This Month"
            value={formatExpenseAmount(record.meralcoPaidThisMonth)}
          />
          <SummaryRow
            label="Meralco Balance"
            value={formatExpenseAmount(derived.meralcoBalance)}
          />
          <SummaryRow
            label="MIWD Paid This Month"
            value={formatExpenseAmount(record.miwdPaidThisMonth)}
          />
          <SummaryRow
            label="MIWD Balance"
            value={formatExpenseAmount(derived.miwdBalance)}
          />
        </div>
      </SectionBanner>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
        TenantHub Expense Report · {monthLabel} · Confidential
      </footer>
    </div>
  );
}
