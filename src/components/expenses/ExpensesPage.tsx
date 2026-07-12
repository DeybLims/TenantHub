"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudDownload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CalculatedAnalytics } from "@/components/expenses/CalculatedAnalytics";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { AppShell } from "@/components/layout/AppShell";
import { useUtilityExpenseAnalytics } from "@/hooks/useUtilityExpenseAnalytics";
import {
  getBillingMonthOptions,
  getDefaultBillingMonth,
} from "@/lib/joinTenantsBilling";
import {
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockTenants,
} from "@/services/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState("");

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

  const billingRows = useMemo(
    () => billingQuery.data ?? [],
    [billingQuery.data],
  );

  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);

  const monthOptions = useMemo(
    () => getBillingMonthOptions(billingRows),
    [billingRows],
  );

  useEffect(() => {
    if (!billingRows.length || selectedMonth) return;
    setSelectedMonth(getDefaultBillingMonth(billingRows));
  }, [billingRows, selectedMonth]);

  const {
    record,
    analytics,
    derived,
    updateRecord,
    save,
    cancel,
    isDirty,
  } = useUtilityExpenseAnalytics({
    selectedMonth,
    billingRows,
    tenants,
  });

  const isLoading = billingQuery.isLoading || tenantsQuery.isLoading;
  const isError = billingQuery.isError || tenantsQuery.isError;
  const error = billingQuery.error ?? tenantsQuery.error;

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Utility Expenses & Distribution
        </h1>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!analytics}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloudDownload className="h-4 w-4" aria-hidden />
          Download Report
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
          <div className="h-[720px] animate-pulse rounded-xl bg-gray-100" />
          <div className="h-[720px] animate-pulse rounded-xl bg-gray-100" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-500">
          {error instanceof Error
            ? error.message
            : "Failed to load utility data"}
        </p>
      )}

      {!isLoading && !isError && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <ExpenseForm
              record={record}
              selectedMonth={selectedMonth}
              monthOptions={monthOptions}
              derived={derived}
              onRecordChange={updateRecord}
              onMonthChange={setSelectedMonth}
              onCancel={cancel}
              onSave={save}
              onExportPdf={() => window.print()}
              isDirty={isDirty}
            />

            <CalculatedAnalytics analytics={analytics} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
