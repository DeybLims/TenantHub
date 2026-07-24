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

function DetailTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ cells: string[]; emphasis?: boolean }>;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-blue-100 text-left text-[11px] font-bold uppercase tracking-wide text-blue-900">
          {headers.map((header) => (
            <th
              key={header}
              className="border border-gray-200 px-3 py-2 last:text-right"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.cells.join("-")}
            className={row.emphasis ? "bg-slate-50 font-semibold" : undefined}
          >
            {row.cells.map((cell, index) => (
              <td
                key={`${row.cells[0]}-${headers[index]}`}
                className={`border border-gray-200 px-3 py-2 text-navy ${
                  index === row.cells.length - 1 ? "text-right" : ""
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Print-ready utility expense export (mirrors billing report structure).
 */
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

  const meralcoTotal = record.meralcoBillAmount;
  const miwdTotal = record.miwdResidential + record.miwdCommercial;
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
          <span
            className={`mt-3 inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${
              record.paidToUtility
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {record.paidToUtility ? "Paid to Utility" : "Unpaid to Utility"}
          </span>
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
          value={formatExpenseAmount(meralcoTotal)}
        />
        <SummaryRow
          label="MIWD Total (Res + Com)"
          value={formatExpenseAmount(miwdTotal)}
        />
        <SummaryRow
          label="JJC Calculated Amount"
          value={formatExpenseAmount(derived.jjcCalculatedAmount)}
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
        title="Master Utility Inputs"
        icon={<FileText className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="space-y-4">
          <DetailTable
            headers={["Utility", "Amount / Base", "Consumption", "True Rate"]}
            rows={[
              {
                cells: [
                  "Meralco",
                  formatExpenseAmount(record.meralcoBillAmount),
                  `${record.meralcoConsumption.toLocaleString("en-PH")} kWh`,
                  derived.meralcoTrueRate > 0
                    ? `₱${derived.meralcoTrueRate.toFixed(2)} /kWh`
                    : "—",
                ],
              },
              {
                cells: [
                  "MIWD Residential",
                  formatExpenseAmount(record.miwdResidential),
                  "—",
                  "—",
                ],
              },
              {
                cells: [
                  "MIWD Commercial",
                  formatExpenseAmount(record.miwdCommercial),
                  "—",
                  "—",
                ],
              },
              {
                cells: [
                  "MIWD Combined",
                  formatExpenseAmount(miwdTotal),
                  `${record.miwdConsumption.toLocaleString("en-PH")} m³`,
                  derived.miwdTrueRate > 0
                    ? `₱${derived.miwdTrueRate.toFixed(2)} /m³`
                    : "—",
                ],
                emphasis: true,
              },
              {
                cells: [
                  "Special Water Rate",
                  `₱${record.miwdSpecialRate.toFixed(2)} /m³`,
                  "—",
                  "—",
                ],
              },
            ]}
          />

          <DetailTable
            headers={[
              "JJC Meter",
              "Previous",
              "Current",
              "Consumption",
              "Calculated Amount",
            ]}
            rows={[
              {
                cells: [
                  "JJC Consumption",
                  record.jjcPreviousReading.toLocaleString("en-PH"),
                  record.jjcCurrentReading.toLocaleString("en-PH"),
                  `${derived.jjcConsumption.toLocaleString("en-PH")} kWh`,
                  formatExpenseAmount(derived.jjcCalculatedAmount),
                ],
              },
            ]}
          />
        </div>
      </SectionBanner>

      <SectionBanner
        title="Electricity (Meralco) Distribution"
        icon={<Zap className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <SummaryRow
            label="Selling Rate"
            value={`₱${derived.electricitySellingRate.toFixed(2)} /kWh`}
          />
          <SummaryRow
            label="JJC Consumption"
            value={`${derived.jjcConsumption.toLocaleString("en-PH")} kWh`}
          />
          <SummaryRow
            label="Total Tenant Consumption"
            value={`${analytics.tenantTotalConsumptionKwh.toLocaleString("en-PH")} kWh`}
          />
          <SummaryRow
            label="Total Tenant Billed"
            value={formatExpenseAmount(analytics.tenantTotalBilled)}
          />
          <SummaryRow
            label="Total Tenant Cost"
            value={formatExpenseAmount(analytics.tenantElectricityTrueCost)}
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
        </div>
      </SectionBanner>

      <SectionBanner
        title="Water (MIWD) Distribution"
        icon={<Droplet className="h-4 w-4 shrink-0" aria-hidden />}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <SummaryRow
            label="Standard Base Rate"
            value={
              derived.miwdTrueRate > 0
                ? `₱${derived.miwdTrueRate.toFixed(2)} /m³`
                : "—"
            }
          />
          <SummaryRow
            label="Residential Base"
            value={formatExpenseAmount(analytics.miwdResidentialAmount)}
          />
          <SummaryRow
            label="Commercial Base"
            value={formatExpenseAmount(analytics.miwdCommercialAmount)}
          />
          <SummaryRow
            label="Total Tenant Consumption"
            value={`${analytics.tenantTotalWaterM3.toLocaleString("en-PH")} m³`}
          />
          <SummaryRow
            label="Standard Base Revenue"
            value={formatExpenseAmount(analytics.tenantWaterRevenue)}
          />
          <SummaryRow
            label="True Tenant Cost"
            value={formatExpenseAmount(analytics.trueTenantWaterCost)}
          />
          <SummaryRow
            label="Net Water Profit"
            value={formatPesoDecimal(analytics.netWaterProfit)}
            valueClass={
              analytics.netWaterProfit >= 0
                ? "text-emerald-600"
                : "text-red-500"
            }
          />
        </div>
      </SectionBanner>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
        TenantHub Expense Report · {monthLabel} · Confidential
      </footer>
    </div>
  );
}
