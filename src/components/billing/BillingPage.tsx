"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BillingPreviewModal } from "@/components/billing/BillingPreviewModal";
import { BillingSummaryWidgets } from "@/components/billing/BillingSummaryWidgets";
import { BillingTable } from "@/components/billing/BillingTable";
import { InvoiceModal } from "@/components/billing/InvoiceModal";
import { PayBalanceModal } from "@/components/billing/PayBalanceModal";
import { AppShell } from "@/components/layout/AppShell";
import { buildBillingTableRows } from "@/lib/buildBillingRows";
import {
  aggregateBillingRowsByTenant,
  computeBillingDashboardSummary,
  filterBillingRowsByDateRange,
} from "@/lib/billingSummary";
import {
  buildBillsForRoom,
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
import type { Bill, BillingTableRow } from "@/types/billing";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

function defaultDateRange(month: string): { from: string; to: string } {
  const base =
    billingMonthToDateInput(month) || new Date().toISOString().slice(0, 10);
  const date = new Date(base);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const from = new Date(year, monthIndex, 15).toISOString().slice(0, 10);
  const to = new Date(year, monthIndex + 1, 15).toISOString().slice(0, 10);
  return { from, to };
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const focusRoom = searchParams.get("room");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPayBalanceOpen, setIsPayBalanceOpen] = useState(false);
  const [payBalanceBill, setPayBalanceBill] = useState<Bill | null>(null);
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

  const billsInRange = useMemo(() => {
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

  const filteredRows = useMemo(
    () => aggregateBillingRowsByTenant(billsInRange),
    [billsInRange],
  );

  const dashboardSummary = useMemo(
    () => computeBillingDashboardSummary(billsInRange),
    [billsInRange],
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

  useEffect(() => {
    if (!focusRoom || filteredRows.length === 0) return;
    const roomNumber = Number(focusRoom);
    const match = filteredRows.find((row) => row.room === roomNumber);
    if (match) {
      setSelectedRow(match);
      setIsPreviewOpen(true);
    }
  }, [focusRoom, filteredRows]);

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

  const handlePayBalance = (bill: Bill) => {
    setPayBalanceBill(bill);
    setIsPayBalanceOpen(true);
  };

  const handlePayBalanceSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setIsPayBalanceOpen(false);
    setPayBalanceBill(null);
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
            fromDate={fromDate}
            toDate={toDate}
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
        bills={tenantBills}
        fromDate={fromDate}
        toDate={toDate}
        onClose={handleClosePreview}
        onExportPdf={handleExportSelected}
        onPayBalance={handlePayBalance}
      />

      <PayBalanceModal
        open={isPayBalanceOpen}
        bill={payBalanceBill}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => {
          setIsPayBalanceOpen(false);
          setPayBalanceBill(null);
        }}
        onSuccess={handlePayBalanceSuccess}
      />
    </AppShell>
  );
}
