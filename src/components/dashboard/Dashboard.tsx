"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBilling, getMockDashboardData } from "@/services/api";
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

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["dashboard", selectedMonth || "default"],
    queryFn: () =>
      USE_MOCK
        ? getMockDashboardData()
        : fetchBilling(selectedMonth || undefined),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (data?.activeMonth && !selectedMonth) {
      setSelectedMonth(data.activeMonth);
    }
  }, [data?.activeMonth, selectedMonth]);

  const months = data?.availableMonths ?? [];
  const isInitialLoad = isLoading && !data;
  const showOverlay = isFetching && !isInitialLoad;

  const monthSelector = (
    <MonthSelect
      months={months}
      value={selectedMonth}
      onChange={setSelectedMonth}
      disabled={isInitialLoad || months.length === 0}
    />
  );

  if (isInitialLoad) {
    return (
      <DashboardLayout monthSelector={monthSelector}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (isError || !data) {
    return (
      <DashboardLayout monthSelector={monthSelector}>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load dashboard"}
        </p>
      </DashboardLayout>
    );
  }

  const { kpis, paymentStatus, properties, utilities } = data;

  return (
    <DashboardLayout monthSelector={monthSelector}>
      <div className="dashboard-area-kpis relative">
        {showOverlay && <DashboardLoadingOverlay />}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={kpis.revenue}
            icon={CircleDollarSign}
            accent="blue"
          />
          <KpiCard
            label="Utility Charges"
            value={kpis.utilityCharges}
            icon={Zap}
            accent="orange"
          />
          <KpiCard
            label="Property Expenses"
            value={kpis.propertyExpenses}
            icon={Receipt}
            accent="coral"
          />
          <KpiCard
            label="Net Income"
            value={kpis.netIncome}
            icon={TrendingUp}
            accent="emerald"
          />
        </section>
      </div>

      <div className="dashboard-area-charts relative grid grid-cols-1 gap-4 lg:grid-cols-2">
        {showOverlay && <DashboardLoadingOverlay />}
        <article className="rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Payment Overview
          </h2>
          <PaymentDonutChart paymentStatus={paymentStatus} />
        </article>

        <article className="rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-500">Properties</h2>
          <PropertiesCard properties={properties} />
        </article>
      </div>

      <article className="dashboard-area-table relative rounded-xl bg-surface-card p-5 shadow-card lg:p-6">
        {showOverlay && <DashboardLoadingOverlay />}
        <h2 className="mb-4 text-sm font-medium text-gray-500">
          Operating Expenses
        </h2>
        <UtilityTable utilities={utilities} />
      </article>
    </DashboardLayout>
  );
}
