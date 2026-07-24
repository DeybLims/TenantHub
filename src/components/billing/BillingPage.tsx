"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudDownload, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BillingPreviewModal } from "@/components/billing/BillingPreviewModal";
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
  const base =
    billingMonthToDateInput(month) || new Date().toISOString().slice(0, 10);
  const date = new Date(base);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const from = new Date(year, monthIndex, 1).toISOString().slice(0, 10);
  const to = new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
    const months = [
      ...new Set(billingRows.map((row) => row.Month).filter(Boolean)),
    ];
    const latest = String(months.at(-1) ?? "");
    setBillingAnchorMonth(latest);
    const range = defaultDateRange(latest);
    setFromDate(range.from);
    setToDate(range.to);
  }, [billingRows, billingAnchorMonth]);

  const filteredRows = useMemo(() => {
    if (!billingRows.length) return [];

    const months = [
      ...new Set(billingRows.map((row) => String(row.Month)).filter(Boolean)),
    ];

    const unique = new Map<string, BillingTableRow>();
    for (const month of months) {
      for (const row of buildBillingTableRows(billingRows, tenants, month)) {
        unique.set(`${row.month}-${row.room}`, row);
      }
    }

    return filterBillingRowsByDateRange(
      Array.from(unique.values()).sort((a, b) => {
        const monthDiff =
          new Date(b.month).getTime() - new Date(a.month).getTime();
        if (monthDiff !== 0) return monthDiff;
        return a.room - b.room;
      }),
      fromDate,
      toDate,
    );
  }, [billingRows, tenants, fromDate, toDate]);

  const dashboardSummary = useMemo(
    () => computeBillingDashboardSummary(filteredRows),
    [filteredRows],
  );

  const tenantBills = useMemo(() => {
    if (!selectedRow) return [];
    return buildBillsForRoom(
      billingRows,
      tenants,
      selectedRow.room,
      fromDate,
      toDate,
    );
  }, [billingRows, tenants, selectedRow, fromDate, toDate]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  const handleBillGenerated = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleSelectRow = (row: BillingTableRow) => {
    setSelectedRow(row);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  const handleExportSelected = () => {
    if (!selectedRow) return;
    printBillingReport({
      tenantName: selectedRow.tenantName,
      unitCode: selectedRow.unitCode,
      fromDate,
      toDate,
      bills: tenantBills,
      periodSummary: summarizeBills(tenantBills),
    });
  };

  const handleExportAll = () => {
    const allBills = filteredRows.flatMap((row) => {
      const tenant = tenants.find((item) => item.Room === row.room);
      return billingRows
        .filter((sheetRow) => Number(sheetRow.Room) === row.room)
        .filter((sheetRow) => {
          const monthDate = new Date(String(sheetRow.Month));
          if (Number.isNaN(monthDate.getTime())) return true;
          if (fromDate && monthDate < new Date(fromDate)) return false;
          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (monthDate > end) return false;
          }
          return true;
        })
        .map((sheetRow) => sheetRowToBill(sheetRow, tenant));
    });

    if (allBills.length === 0) return;

    printBillingReport({
      tenantName: "All Tenants",
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
            onClick={() => setIsInvoiceOpen(true)}
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
        <div className="space-y-4" aria-hidden>
          <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-[480px] animate-pulse rounded-xl bg-gray-100" />
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <BillingTable
            rows={filteredRows}
            selectedRow={selectedRow}
            onSelectRow={handleSelectRow}
          />
        </div>
      )}

      <InvoiceModal
        open={isInvoiceOpen}
        selectedMonth={billingAnchorMonth}
        tenants={tenants}
        billingRows={billingRows}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={handleBillGenerated}
      />

      <BillingPreviewModal
        open={isPreviewOpen && selectedRow != null}
        tenantName={selectedRow?.tenantName ?? ""}
        unitCode={selectedRow?.unitCode ?? ""}
        fromDate={fromDate}
        toDate={toDate}
        bills={tenantBills}
        onClose={handleClosePreview}
        onExportPdf={handleExportSelected}
      />
    </AppShell>
  );
}
