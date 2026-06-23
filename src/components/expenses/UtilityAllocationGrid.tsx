"use client";

import { Building2, Users, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { formatExpenseAmount } from "@/lib/format";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";

interface UtilityAllocationGridProps {
  motorKw: string;
  motorRate: string;
  motorTotal: number;
  jjcElec: string;
  jjcWater: string;
  jjcTotal: number;
  tenantElec: string;
  tenantWater: string;
  tenantTotal: number;
  masterTotal: number;
  locked: boolean;
  onMotorKwChange: (value: string) => void;
  onMotorRateChange: (value: string) => void;
  onJjcElecChange: (value: string) => void;
  onJjcWaterChange: (value: string) => void;
  onTenantElecChange: (value: string) => void;
  onTenantWaterChange: (value: string) => void;
  onAutoSyncTenants: () => void;
}

function OutputBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-navy">{value}</p>
    </div>
  );
}

function AllocationCard({
  title,
  icon,
  headerAction,
  children,
  outputLabel,
  outputValue,
}: {
  title: string;
  icon: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  outputLabel: string;
  outputValue: string;
}) {
  return (
    <article className="flex flex-col rounded-xl bg-surface-card p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            {icon}
          </span>
          <h3 className="text-sm font-bold text-navy">{title}</h3>
        </div>
        {headerAction}
      </div>

      <div className="flex flex-1 flex-col gap-4">{children}</div>

      <div className="mt-5">
        <OutputBlock label={outputLabel} value={outputValue} />
      </div>
    </article>
  );
}

export function UtilityAllocationGrid({
  motorKw,
  motorRate,
  motorTotal,
  jjcElec,
  jjcWater,
  jjcTotal,
  tenantElec,
  tenantWater,
  tenantTotal,
  masterTotal,
  locked,
  onMotorKwChange,
  onMotorRateChange,
  onJjcElecChange,
  onJjcWaterChange,
  onTenantElecChange,
  onTenantWaterChange,
  onAutoSyncTenants,
}: UtilityAllocationGridProps) {
  const disabledClass = locked ? "cursor-not-allowed bg-gray-100 opacity-70" : "";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AllocationCard
          title="APT MOTOR CONSUMPTION"
          icon={<Zap className="h-4 w-4" aria-hidden />}
          outputLabel="Total Amount"
          outputValue={formatExpenseAmount(motorTotal)}
        >
          <FloatingLabelField label="Kilowatts (KW)">
            <input
              type="number"
              min={0}
              step="any"
              value={motorKw}
              disabled={locked}
              onChange={(event) => onMotorKwChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
          <FloatingLabelField label="Rate (₱)">
            <input
              type="number"
              min={0}
              step="any"
              value={motorRate}
              disabled={locked}
              onChange={(event) => onMotorRateChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
        </AllocationCard>

        <AllocationCard
          title="JJC CONSUMPTION"
          icon={<Building2 className="h-4 w-4" aria-hidden />}
          outputLabel="Total JJC Expense"
          outputValue={formatExpenseAmount(jjcTotal)}
        >
          <FloatingLabelField label="Electricity Amount (₱)">
            <input
              type="number"
              min={0}
              step="any"
              value={jjcElec}
              disabled={locked}
              onChange={(event) => onJjcElecChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
          <FloatingLabelField label="Water Amount (₱)">
            <input
              type="number"
              min={0}
              step="any"
              value={jjcWater}
              disabled={locked}
              onChange={(event) => onJjcWaterChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
        </AllocationCard>

        <AllocationCard
          title="APT TENANTS"
          icon={<Users className="h-4 w-4" aria-hidden />}
          outputLabel="Total Tenant Allocation"
          outputValue={formatExpenseAmount(tenantTotal)}
          headerAction={
            <button
              type="button"
              disabled={locked}
              onClick={onAutoSyncTenants}
              className="text-xs font-semibold text-brand-blue hover:text-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Auto-Sync from Billing
            </button>
          }
        >
          <FloatingLabelField label="Electricity Amount (₱)">
            <input
              type="number"
              min={0}
              step="any"
              value={tenantElec}
              disabled={locked}
              onChange={(event) => onTenantElecChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
          <FloatingLabelField label="Water Amount (₱)">
            <input
              type="number"
              min={0}
              step="any"
              value={tenantWater}
              disabled={locked}
              onChange={(event) => onTenantWaterChange(event.target.value)}
              className={`${floatingInputClass} ${disabledClass}`}
            />
          </FloatingLabelField>
        </AllocationCard>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-gray-600">
          Master Utility Bill Total
        </span>
        <span className="text-xl font-bold text-navy">
          {formatExpenseAmount(masterTotal)}
        </span>
      </div>
    </div>
  );
}
