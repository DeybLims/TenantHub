"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudDownload, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BillingDetailPanel } from "@/components/billing/BillingDetailPanel";
import { BillingDetailPlaceholder } from "@/components/billing/BillingDetailPlaceholder";
import { BillingKpiCards } from "@/components/billing/BillingKpiCards";
import { BillingTable } from "@/components/billing/BillingTable";
import { TenantInvoiceModal } from "@/components/billing/TenantInvoiceModal";
import { MonthSelect } from "@/components/dashboard/MonthSelect";
import { AppShell } from "@/components/layout/AppShell";
import {
  buildBillingTableRows,
  findBillingSheetRow,
} from "@/lib/buildBillingRows";
import { buildUpdateBillPayload } from "@/lib/buildUpdateBillPayload";
import { computeBillingKpis } from "@/lib/billingSummary";
import {
  getBillingMonthOptions,
  getDefaultBillingMonth,
} from "@/lib/joinTenantsBilling";
import {
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockTenants,
  updateBill,
} from "@/services/api";
import type { BillingDetailSaveData, BillingTableRow } from "@/types/billing";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function BillingPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BillingTableRow | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockTenants()) : fetchTenants(),
  });

  const billingQuery = useQuery({
    queryKey: ["billing", "rows"],
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(getMockBillingRows())
        : fetchBillingRows(),
  });

  const tenants = tenantsQuery.data;
  const billingRows = billingQuery.data;

  const monthOptions = useMemo(
    () => (billingRows ? getBillingMonthOptions(billingRows) : []),
    [billingRows],
  );

  useEffect(() => {
    if (!billingRows?.length || selectedMonth) return;
    setSelectedMonth(getDefaultBillingMonth(billingRows));
  }, [billingRows, selectedMonth]);

  const tableRows = useMemo(() => {
    if (!tenants || !billingRows || !selectedMonth) return [];
    return buildBillingTableRows(billingRows, tenants, selectedMonth);
  }, [billingRows, tenants, selectedMonth]);

  const kpiSummary = useMemo(
    () => computeBillingKpis(tableRows),
    [tableRows],
  );

  const selectedRowData = useMemo(() => {
    if (!selectedRow) return null;
    return (
      tableRows.find((row) => row.room === selectedRow.room) ?? null
    );
  }, [tableRows, selectedRow]);

  const selectedSheetRow = useMemo(() => {
    if (!selectedRowData || !billingRows) return undefined;
    return findBillingSheetRow(
      billingRows,
      selectedRowData.room,
      selectedMonth,
    );
  }, [selectedRowData, billingRows, selectedMonth]);

  const saveBillMutation = useMutation({
    mutationFn: ({
      room,
      data,
    }: {
      room: number;
      data: BillingDetailSaveData;
    }) =>
      updateBill(buildUpdateBillPayload(selectedMonth, room, data)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useEffect(() => {
    if (
      selectedRow &&
      !tableRows.some((row) => row.room === selectedRow.room)
    ) {
      setSelectedRow(null);
    }
  }, [tableRows, selectedRow]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  const handleBillGenerated = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleSaveBill = (data: BillingDetailSaveData) => {
    if (!selectedRowData || !selectedMonth) return;
    saveBillMutation.mutate({ room: selectedRowData.room, data });
  };

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Billing Records
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <MonthSelect
            months={monthOptions}
            value={selectedMonth}
            onChange={setSelectedMonth}
            disabled={isLoading || monthOptions.length === 0}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!selectedMonth}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Generate Bill
          </button>
          <button
            type="button"
            onClick={() =>
              window.alert("Export All to PDF will connect to your API.")
            }
            className="inline-flex items-center gap-2 rounded-lg bg-brand-emerald px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            <CloudDownload className="h-4 w-4" aria-hidden />
            Export All to PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:w-2/3">
          <article className="rounded-xl bg-surface-card shadow-card">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold text-navy">Rental Charges</h2>
            </div>

            <div className="px-5 py-4 sm:px-6">
              {isLoading && (
                <div className="space-y-3 py-6" aria-hidden>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-lg bg-gray-100"
                    />
                  ))}
                </div>
              )}

              {isError && (
                <p className="py-8 text-center text-sm text-red-600">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load billing records"}
                </p>
              )}

              {!isLoading && !isError && (
                <>
                  <BillingKpiCards summary={kpiSummary} />
                  <BillingTable
                    rows={tableRows}
                    selectedRow={selectedRowData}
                    onSelectRow={setSelectedRow}
                  />
                </>
              )}
            </div>
          </article>
        </div>

        <div className="min-w-0 lg:w-1/3">
          {selectedRowData ? (
            <BillingDetailPanel
              row={selectedRowData}
              sheetRow={selectedSheetRow}
              onSave={handleSaveBill}
              isSaving={saveBillMutation.isPending}
              saveError={
                saveBillMutation.error instanceof Error
                  ? saveBillMutation.error.message
                  : null
              }
              onExportPdf={() =>
                window.alert("Export to PDF will connect to your API.")
              }
            />
          ) : (
            <BillingDetailPlaceholder />
          )}
        </div>
      </div>

      <TenantInvoiceModal
        open={isModalOpen}
        selectedMonth={selectedMonth}
        tenants={tenants ?? []}
        billingRows={billingRows ?? []}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBillGenerated}
      />
    </AppShell>
  );
}
