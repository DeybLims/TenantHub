"use client";

import { Droplet, X, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { formatMonthLabel } from "@/lib/months";
import {
  formatDatePaid,
  formatMoveInDate,
  formatPesoDecimal,
} from "@/lib/format";
import {
  getBillingStatusPillClass,
  normalizeBillingStatusLabel,
} from "@/components/tenants/tenantStatusStyles";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import type { SheetRow } from "@/types/sheet";

const leaseStatusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Vacant: "bg-gray-100 text-gray-700",
};

interface TenantDetailPanelProps {
  tenant: TenantTableRow;
  billing: SheetRow | undefined;
  selectedMonth: string;
  onClose: () => void;
}

function InfoTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-navy">{value}</div>
    </div>
  );
}

interface UtilityCardProps {
  title: string;
  icon: ReactNode;
  iconClassName: string;
  prev: number;
  curr: number;
  usage: number;
  usageUnit: string;
  amount: number;
}

function UtilityCard({
  title,
  icon,
  iconClassName,
  prev,
  curr,
  usage,
  usageUnit,
  amount,
}: UtilityCardProps) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${iconClassName}`}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold text-navy">{title}</span>
      </div>
      <dl className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between">
          <dt>Prev</dt>
          <dd className="font-medium text-navy">{prev.toLocaleString("en-PH")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Curr</dt>
          <dd className="font-medium text-navy">{curr.toLocaleString("en-PH")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Usage</dt>
          <dd className="font-medium text-navy">
            {usage.toLocaleString("en-PH")} {usageUnit}
          </dd>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1.5">
          <dt className="font-medium text-gray-700">Amount</dt>
          <dd className="font-semibold text-navy">{formatPesoDecimal(amount)}</dd>
        </div>
      </dl>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName = "text-navy",
  bold,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span
        className={`${bold ? "font-bold" : "font-medium"} ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

export function TenantDetailPanel({
  tenant,
  billing,
  selectedMonth,
  onClose,
}: TenantDetailPanelProps) {
  const displayName = tenant.Name || "—";
  const monthLabel = formatMonthLabel(selectedMonth);
  const unitSubtitle = [
    tenant.UnitCode ? `Unit: ${tenant.UnitCode}` : null,
    tenant.Room ? `Room: ${tenant.Room}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const adjustment = billing ? readSheetNumber(billing.Adjustment) : 0;
  const totalDue = billing ? readSheetNumber(billing.TotalDue) : 0;
  const paid = billing ? readSheetNumber(billing.Paid) : 0;
  const remaining = totalDue - paid;

  const elecPrev = billing ? readSheetNumber(billing.ElecPrev) : 0;
  const elecCurr = billing ? readSheetNumber(billing.ElecCurr) : 0;
  const waterPrev = billing ? readSheetNumber(billing.WaterPrev) : 0;
  const waterCurr = billing ? readSheetNumber(billing.WaterCurr) : 0;

  const billingStatusLabel = billing
    ? normalizeBillingStatusLabel(String(billing.Status))
    : null;
  const datePaidFormatted = billing
    ? formatDatePaid(billing.DatePaid, String(billing.Status))
    : null;

  return (
    <article className="flex h-full flex-col rounded-xl bg-surface-card shadow-card">
      <div className="relative border-b border-gray-100 px-5 py-4">
        <h2 className="pr-8 text-base font-semibold text-navy">Tenant Information</h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close tenant details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-lg font-bold text-white"
            aria-hidden
          >
            {getTenantInitials(displayName)}
          </div>
          <h3 className="text-lg font-bold text-navy">{displayName}</h3>
          {unitSubtitle && (
            <p className="mt-1 text-xs text-gray-500">{unitSubtitle}</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Base Rent" value={formatPesoDecimal(tenant.Rent)} />
          <InfoTile
            label="Deposit"
            value={formatPesoDecimal(tenant.Deposit)}
          />
          <InfoTile
            label="Move-in Date"
            value={formatMoveInDate(tenant.MoveIn)}
          />
          <InfoTile
            label="Status"
            value={
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  leaseStatusStyles[tenant.Status] ?? leaseStatusStyles.Vacant
                }`}
              >
                {tenant.Status}
              </span>
            }
          />
        </div>

        <section className="mt-6 border-t border-gray-100 pt-5">
          <h4 className="text-sm font-bold uppercase tracking-wide text-navy">
            Monthly Billing Details ({monthLabel})
          </h4>

          {!billing ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No billing data generated for {monthLabel}.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <UtilityCard
                  title="Electricity"
                  icon={<Zap className="h-4 w-4 text-amber-600" aria-hidden />}
                  iconClassName="bg-amber-100"
                  prev={elecPrev}
                  curr={elecCurr}
                  usage={Math.max(0, elecCurr - elecPrev)}
                  usageUnit="kWh"
                  amount={readSheetNumber(billing.ElecBill)}
                />
                <UtilityCard
                  title="Water"
                  icon={
                    <Droplet className="h-4 w-4 text-sky-600" aria-hidden />
                  }
                  iconClassName="bg-sky-100"
                  prev={waterPrev}
                  curr={waterCurr}
                  usage={Math.max(0, waterCurr - waterPrev)}
                  usageUnit="m³"
                  amount={readSheetNumber(billing.WaterBill)}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-1">
                <SummaryRow
                  label="Adjustments"
                  value={formatPesoDecimal(adjustment)}
                />
                <SummaryRow
                  label="Total Due"
                  value={formatPesoDecimal(totalDue)}
                  bold
                />
                <SummaryRow
                  label="Amount Paid"
                  value={formatPesoDecimal(paid)}
                  valueClassName="text-emerald-700"
                />
                <SummaryRow
                  label="Date Paid"
                  value={datePaidFormatted ?? "—"}
                  valueClassName={
                    datePaidFormatted ? "text-navy" : "text-gray-400"
                  }
                />
                <SummaryRow
                  label="Remaining Balance"
                  value={formatPesoDecimal(remaining)}
                  valueClassName={
                    remaining > 0 ? "text-red-600" : "text-emerald-700"
                  }
                  bold
                />
              </div>

              {billingStatusLabel && (
                <div
                  className={getBillingStatusPillClass(String(billing.Status))}
                  role="status"
                  aria-label={`Billing status: ${billingStatusLabel}`}
                >
                  {billingStatusLabel}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
