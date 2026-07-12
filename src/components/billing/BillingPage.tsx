"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudDownload, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BillingDetails } from "@/components/billing/BillingDetails";
import { BillingDetailPlaceholder } from "@/components/billing/BillingDetailPlaceholder";
import { BillingSummaryWidgets } from "@/components/billing/BillingSummaryWidgets";
import { BillingTable } from "@/components/billing/BillingTable";
import { InvoiceModal } from "@/components/billing/InvoiceModal";
import { AppShell } from "@/components/layout/AppShell";
import { buildBillingTableRows } from "@/lib/buildBillingRows";
import {
  computeBillingDashboardSummary,
  filterBillingRowsByDateRange,
} from "@/lib/billingSummary";
import {
  buildBillsForRoom,
  sheetRowToBill,
  summarizeBills,
} from "@/lib/mapBillingViewModel";
import { billingMonthToDateInput } from "@/lib/months";
import { printBillingReport } from "@/lib/printBillingReport";
import {
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockTenants,
} from "@/services/api";
import type { BillingTableRow } from "@/types/billing";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function defaultDateRange(month: string): { from: string; to: string } {
  const base = billingMonthToDateInput(month) || new Date().toISOString().slice(0, 10);
  const date = new Date(base);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const from = new Date(year, monthIndex, 1).toISOString().slice(0, 10);
  const to = new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BillingTableRow | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [billingAnchorMonth, setBillingAnchorMonth] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockTenants()) : fetchTenants(),
  });

  const billingQuery = useQuery({
    queryKey: ["billing", "rows"],
    queryFn: () =>
      USE_MOCK ? Promise.resolve(getMockBillingRows()) : fetchBillingRows(),
  });

  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);
  const billingRows = useMemo(
    () => billingQuery.data ?? [],
    [billingQuery.data],
  );

  useEffect(() => {
    if (!billingRows.length || billingAnchorMonth) return;
    const months = [...new Set(billingRows.map((row) => row.Month).filter(Boolean))];
    const latest = months.at(-1) ?? "";
    setBillingAnchorMonth(latest);
    const range = defaultDateRange(latest);
    setFromDate(range.from);
    setToDate(range.to);
  }, [billingRows, billingAnchorMonth]);

  const filteredRows = useMemo(() => {
    if (!billingRows.length) return [];
    const monthRows = billingRows.reduce<BillingTableRow[]>((acc, row) => {
      const month = String(row.Month);
      const existing = buildBillingTableRows(billingRows, tenants, month);
      return [...acc, ...existing];
    }, []);

    const unique = new Map<string, BillingTableRow>();
    for (const row of monthRows) {
      unique.set(`${row.month}-${row.room}`, row);
    }

    return filterBillingRowsByDateRange(
      Array.from(unique.values()).sort((a, b) => a.room - b.room),
      fromDate,
      toDate,
    );
  }, [billingRows, tenants, fromDate, toDate]);

  const dashboardSummary = useMemo(
    () => computeBillingDashboardSummary(filteredRows),
    [filteredRows],
  );

  const selectedRowData = useMemo(() => {
    if (!selectedRow) return null;
    return filteredRows.find((row) => row.room === selectedRow.room) ?? selectedRow;
  }, [filteredRows, selectedRow]);

  const tenantBills = useMemo(() => {
    if (!selectedRowData) return [];
    return buildBillsForRoom(
      billingRows,
      tenants,
      selectedRowData.room,
      fromDate,
      toDate,
    );
  }, [billingRows, tenants, selectedRowData, fromDate, toDate]);

  useEffect(() => {
    if (selectedRow && !filteredRows.some((row) => row.room === selectedRow.room)) {
      setSelectedRow(null);
    }
  }, [filteredRows, selectedRow]);

  useEffect(() => {
    if (selectedRow || filteredRows.length === 0) return;
    setSelectedRow(filteredRows[0]);
  }, [filteredRows, selectedRow]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  const handleBillGenerated = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const exportProps = selectedRowData
    ? {
        tenantName: selectedRowData.tenantName,
        unitCode: selectedRowData.unitCode,
        fromDate,
        toDate,
        bills: tenantBills,
        periodSummary: summarizeBills(tenantBills),
      }
    : null;

  const handleExportSelected = () => {
    if (!exportProps) return;
    printBillingReport(exportProps);
  };

  const handleExportAll = () => {
    const tenantMap = new Map<number, BillingTableRow>();
    for (const row of filteredRows) {
      tenantMap.set(row.room, row);
    }

    const allBills = filteredRows.flatMap((row) => {
      const tenant = tenants.find((item) => item.Room === row.room);
      return billingRows
        .filter((sheetRow) => Number(sheetRow.Room) === row.room)
        .map((sheetRow) => sheetRowToBill(sheetRow, tenant));
    });

    if (allBills.length === 0) return;

    const first = tenantMap.values().next().value;
    printBillingReport({
      tenantName: first ? "All Tenants" : "Billing",
      unitCode: "Portfolio",
      fromDate,
      toDate,
      bills: allBills,
      periodSummary: summarizeBills(allBills),
    });
  };

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-navy">Billing Records</h1>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!billingAnchorMonth}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Generate Bill
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloudDownload className="h-4 w-4" aria-hidden />
            Export All to PDF
          </button>
        </div>
      </div>

      {!isLoading && !isError && (
        <BillingSummaryWidgets
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          summary={dashboardSummary}
        />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-hidden>
          <div className="h-[640px] animate-pulse rounded-xl bg-gray-100 lg:col-span-7" />
          <div className="h-[640px] animate-pulse rounded-xl bg-gray-100 lg:col-span-5" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-500">
          {error instanceof Error
            ? error.message
            : "Failed to load billing records"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-7">
            <BillingTable
              rows={filteredRows}
              selectedRow={selectedRowData}
              onSelectRow={setSelectedRow}
            />
          </div>

          <div className="min-w-0 lg:col-span-5">
            {selectedRowData ? (
              <BillingDetails
                tenantName={selectedRowData.tenantName}
                unitCode={selectedRowData.unitCode}
                room={selectedRowData.room}
                fromDate={fromDate}
                toDate={toDate}
                bills={tenantBills}
                onExportPdf={handleExportSelected}
              />
            ) : (
              <BillingDetailPlaceholder />
            )}
          </div>
        </div>
      )}

      <InvoiceModal
        open={isModalOpen}
        selectedMonth={billingAnchorMonth}
        tenants={tenants}
        billingRows={billingRows}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBillGenerated}
      />
    </AppShell>
  );
}
