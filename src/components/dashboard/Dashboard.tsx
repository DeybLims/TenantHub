"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PaymentDonutChart } from "@/components/dashboard/PaymentDonutChart";
import { PropertiesCard } from "@/components/dashboard/PropertiesCard";
import { UtilityTable } from "@/components/dashboard/UtilityTable";
import { MonthSelect } from "@/components/dashboard/MonthSelect";
import {
  DashboardLoadingOverlay,
  DashboardSkeleton,
} from "@/components/dashboard/DashboardSkeleton";
import { useUtilityExpenseAnalytics } from "@/hooks/useUtilityExpenseAnalytics";
import {
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockDashboardData,
  getMockTenants,
} from "@/services/api";
import { transformSheetToDashboard } from "@/lib/transformSheetData";
import type { UtilityRow } from "@/types/dashboard";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const billingQuery = useQuery({
    queryKey: ["billing", "rows"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockBillingRows()) : fetchBillingRows(),
  });

  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockTenants()) : fetchTenants(),
  });

  const data = useMemo(() => {
    if (USE_MOCK) return getMockDashboardData();
    const rows = billingQuery.data;
    if (!rows?.length) return undefined;
    return transformSheetToDashboard(rows, selectedMonth || undefined);
  }, [billingQuery.data, selectedMonth]);

  const isLoading = billingQuery.isLoading;
  const isFetching = billingQuery.isFetching;
  const isError = billingQuery.isError;
  const error = billingQuery.error;

  useEffect(() => {
    if (data?.activeMonth && !selectedMonth) {
      setSelectedMonth(data.activeMonth);
    }
  }, [data?.activeMonth, selectedMonth]);

  const { analytics: expenseAnalytics } = useUtilityExpenseAnalytics({
    selectedMonth: selectedMonth || data?.activeMonth || "",
    billingRows: billingQuery.data ?? [],
    tenants: tenantsQuery.data ?? [],
  });

  const months = data?.availableMonths ?? [];
  const isInitialLoad = isLoading && !data;
  const showOverlay = isFetching && !isInitialLoad;

  const monthSelector = (
    <MonthSelect
      months={months}
      value={selectedMonth}
      onChange={setSelectedMonth}
      disabled={isInitialLoad || months.length === 0}
      useThisMonthLabel
    />
  );

  const utilities = useMemo((): UtilityRow[] => {
    if (!data) return [];

    if (expenseAnalytics) {
      const electricityActual =
        expenseAnalytics.derived.jjcCalculatedAmount +
        expenseAnalytics.derived.motorCalculatedAmount +
        expenseAnalytics.derived.apartmentCalculatedAmount;
      const waterActual =
        expenseAnalytics.derived.miwdResidentialAmount +
        expenseAnalytics.derived.miwdCommercialAmount +
        expenseAnalytics.derived.pumpedWaterAmount +
        expenseAnalytics.waterMotorCost;

      const electricityRow = data.utilities.find(
        (row) => row.utility === "Electricity",
      );
      const waterRow = data.utilities.find((row) => row.utility === "Water");

      return [
        {
          utility: "Electricity",
          actualCost: electricityActual || electricityRow?.actualCost || 0,
          tenantPaid: electricityRow?.tenantPaid || 0,
          profitLoss: 0,
        },
        {
          utility: "Water",
          actualCost: waterActual || waterRow?.actualCost || 0,
          tenantPaid:
            waterRow?.tenantPaid || expenseAnalytics.tenantWaterRevenue,
          profitLoss: 0,
        },
      ].map((row) => ({
        ...row,
        profitLoss: row.tenantPaid - row.actualCost,
      }));
    }

    return data.utilities;
  }, [data, expenseAnalytics]);

  const kpis = useMemo(() => {
    if (!data) return null;

    const utilityCharges = utilities.reduce(
      (sum, row) => sum + row.actualCost,
      0,
    );
    const tenantCollections = utilities.reduce(
      (sum, row) => sum + row.tenantPaid,
      0,
    );
    const netIncome = utilities.reduce((sum, row) => sum + row.profitLoss, 0);

    return {
      utilityCharges,
      tenantCollections,
      outstandingBalance: data.paymentStatus.outstanding,
      netIncome,
    };
  }, [data, utilities]);

  if (isInitialLoad) {
    return (
      <DashboardLayout monthSelector={monthSelector}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (isError || !data || !kpis) {
    return (
      <DashboardLayout monthSelector={monthSelector}>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load dashboard"}
        </p>
      </DashboardLayout>
    );
  }

  const { paymentStatus, properties } = data;

  return (
    <DashboardLayout monthSelector={monthSelector}>
      <div className="dashboard-area-kpis relative">
        {showOverlay && <DashboardLoadingOverlay />}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Utility Charges"
            value={kpis.utilityCharges}
            accent="orange"
          />
          <KpiCard
            label="Tenant Collections"
            value={kpis.tenantCollections}
            accent="blue"
          />
          <KpiCard
            label="Outstanding Balance"
            value={kpis.outstandingBalance}
            accent="coral"
          />
          <KpiCard
            label="Net Income"
            value={kpis.netIncome}
            accent="emerald"
          />
        </section>
      </div>

      <div className="dashboard-area-charts relative grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {showOverlay && <DashboardLoadingOverlay />}
        <article className="min-w-0 rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Operating Expenses
          </h2>
          <UtilityTable utilities={utilities} />
        </article>

        <article className="min-w-0 rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Payment Overview
          </h2>
          <PaymentDonutChart paymentStatus={paymentStatus} />
        </article>
      </div>

      <article className="dashboard-area-properties relative rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
        {showOverlay && <DashboardLoadingOverlay />}
        <h2 className="mb-5 text-sm font-medium text-gray-500">
          Properties / Occupancy Overview
        </h2>
        <PropertiesCard properties={properties} />
      </article>
    </DashboardLayout>
  );
}
