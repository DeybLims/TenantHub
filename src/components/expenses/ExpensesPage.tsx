"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MonthSelect } from "@/components/dashboard/MonthSelect";
import { UtilityAnalyticsPanel } from "@/components/expenses/UtilityAnalyticsPanel";
import { UtilityDistributionForm } from "@/components/expenses/UtilityDistributionForm";
import { AppShell } from "@/components/layout/AppShell";
import {
  getBillingMonthOptions,
  getDefaultBillingMonth,
} from "@/lib/joinTenantsBilling";
import { computeUtilityDistribution } from "@/lib/utilityDistributionSummary";
import { fetchBillingRows, getMockBillingRows } from "@/services/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState("");

  const billingQuery = useQuery({
    queryKey: ["billing", "rows"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockBillingRows()) : fetchBillingRows(),
  });

  const billingRows = useMemo(
    () => billingQuery.data ?? [],
    [billingQuery.data],
  );

  const monthOptions = useMemo(
    () => getBillingMonthOptions(billingRows),
    [billingRows],
  );

  useEffect(() => {
    if (!billingRows.length || selectedMonth) return;
    setSelectedMonth(getDefaultBillingMonth(billingRows));
  }, [billingRows, selectedMonth]);

  const summary = useMemo(
    () => computeUtilityDistribution(billingRows, selectedMonth),
    [billingRows, selectedMonth],
  );

  const isLoading = billingQuery.isLoading;
  const isError = billingQuery.isError;
  const error = billingQuery.error;

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Utility Expenses & Distribution
        </h1>

        <MonthSelect
          months={monthOptions}
          value={selectedMonth}
          onChange={setSelectedMonth}
          disabled={isLoading || monthOptions.length === 0}
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5" aria-hidden>
          <div className="h-[640px] animate-pulse rounded-xl bg-gray-100 lg:col-span-3" />
          <div className="h-[640px] animate-pulse rounded-xl bg-gray-100 lg:col-span-2" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-600">
          {error instanceof Error
            ? error.message
            : "Failed to load utility data from billing"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-3">
            <UtilityDistributionForm
              summary={summary}
              selectedMonth={selectedMonth}
            />
          </div>
          <div className="lg:col-span-2">
            <UtilityAnalyticsPanel summary={summary} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
