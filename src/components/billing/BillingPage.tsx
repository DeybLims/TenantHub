"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  billingMonthKey,
  billingMonthToDateInput,
  sortMonths,
} from "@/lib/months";
import { printBillingReport } from "@/lib/printBillingReport";
import { readSheetNumber } from "@/lib/readSheetNumber";
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
  // Local YYYY-MM-DD — avoid toISOString() shifting the day in UTC+ timezones.
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(monthIndex + 1)}-15`;
  const next = new Date(year, monthIndex + 1, 15);
  const to = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-15`;
  return { from, to };
}

/** Expand From/To so every bill month for a room is included in the statement. */
function dateRangeCoveringRoomMonths(
  months: string[],
): { from: string; to: string } | null {
  const sorted = sortMonths(months.filter(Boolean));
  if (!sorted.length) return null;

  const from = billingMonthToDateInput(sorted[0]);
  const lastKey = billingMonthKey(sorted[sorted.length - 1]);
  if (!from || !lastKey) return null;

  const [y, m] = lastKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${lastKey}-${String(lastDay).padStart(2, "0")}`;
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
    const months = sortMonths([
      ...new Set(billingRows.map((row) => String(row.Month)).filter(Boolean)),
    ]);
    const latest = String(months.at(-1) ?? "");
    setBillingAnchorMonth(latest);
    const range = defaultDateRange(latest);
    setFromDate(range.from);
    setToDate(range.to);
  }, [billingRows, billingAnchorMonth]);

  const billsInRange = useMemo(() => {
    if (!billingRows.length) return [];

    const months = sortMonths([
      ...new Set(billingRows.map((row) => String(row.Month)).filter(Boolean)),
    ]);

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
    () => computeBillingDashboardSummary(filteredRows),
    [filteredRows],
  );

  // Statement modal always uses the tenant's overall bills (all months),
  // so users don't need to tweak the page From/To just to view a full statement.
  const tenantBills = useMemo(() => {
    if (!selectedRow) return [];
    return buildBillsForRoom(billingRows, tenants, selectedRow.room);
  }, [billingRows, tenants, selectedRow]);

  const statementRange = useMemo(() => {
    const covered = dateRangeCoveringRoomMonths(
      tenantBills.map((bill) => bill.billingMonth),
    );
    return covered ?? { from: fromDate, to: toDate };
  }, [tenantBills, fromDate, toDate]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  // Open overall statement once when arriving via ?room= (Tenants → Billing Summary).
  const focusedRoomOpened = useRef<string | null>(null);
  useEffect(() => {
    if (!focusRoom || !billingRows.length || !tenants.length) return;
    if (focusedRoomOpened.current === focusRoom) return;

    const roomNumber = Number(focusRoom);
    if (!Number.isFinite(roomNumber)) return;

    const roomSheetRows = billingRows.filter(
      (row) => Number(row.Room) === roomNumber,
    );
    if (!roomSheetRows.length) return;

    const months = sortMonths([
      ...new Set(billingRows.map((row) => String(row.Month)).filter(Boolean)),
    ]);
    const latest = String(months.at(-1) ?? "");
    if (!billingAnchorMonth) setBillingAnchorMonth(latest);

    focusedRoomOpened.current = focusRoom;

    const matchInTable = filteredRows.find((row) => row.room === roomNumber);
    if (matchInTable) {
      setSelectedRow(matchInTable);
      setIsPreviewOpen(true);
      return;
    }

    const tenant = tenants.find((item) => item.Room === roomNumber);
    const bills = buildBillsForRoom(billingRows, tenants, roomNumber);
    const totalDue = bills.reduce((sum, bill) => sum + bill.totalDue, 0);
    const paid = bills.reduce((sum, bill) => sum + bill.amountPaid, 0);
    const balance = Math.max(0, totalDue - paid);
    let status = "Unpaid";
    if (balance <= 0 && totalDue > 0) status = "Paid";
    else if (paid > 0 && balance > 0) status = "Partial";

    const latestBill = bills[0];
    const latestSheet = roomSheetRows
      .slice()
      .sort(
        (a, b) =>
          new Date(String(b.Month)).getTime() -
          new Date(String(a.Month)).getTime(),
      )[0];

    setSelectedRow({
      room: roomNumber,
      unitCode: tenant?.UnitCode ?? latestBill?.unitCode ?? "—",
      tenantName: tenant?.Name ?? latestBill?.tenantName ?? "—",
      month: latestBill?.billingMonth ?? latest,
      totalDue,
      paid,
      balance,
      status,
      rent: latestBill?.baseRent ?? readSheetNumber(latestSheet?.Rent),
      elecBill:
        latestBill?.electricity.amount ??
        readSheetNumber(latestSheet?.ElecBill),
      elecPrev:
        latestBill?.electricity.previous ??
        readSheetNumber(latestSheet?.ElecPrev),
      elecCurr:
        latestBill?.electricity.current ??
        readSheetNumber(latestSheet?.ElecCurr),
      waterBill:
        latestBill?.water.amount ?? readSheetNumber(latestSheet?.WaterBill),
      waterPrev:
        latestBill?.water.previous ?? readSheetNumber(latestSheet?.WaterPrev),
      waterCurr:
        latestBill?.water.current ?? readSheetNumber(latestSheet?.WaterCurr),
      otherCharges:
        latestBill?.otherCharges ?? readSheetNumber(latestSheet?.Adjustment),
    });
    setIsPreviewOpen(true);
  }, [
    focusRoom,
    billingRows,
    tenants,
    filteredRows,
    billingAnchorMonth,
  ]);

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
      fromDate: statementRange.from,
      toDate: statementRange.to,
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
        fromDate={statementRange.from}
        toDate={statementRange.to}
        onClose={handleClosePreview}
        onExportPdf={handleExportSelected}
        onPayBalance={handlePayBalance}
      />

      <PayBalanceModal
        open={isPayBalanceOpen}
        bill={payBalanceBill}
        fromDate={statementRange.from}
        toDate={statementRange.to}
        onClose={() => {
          setIsPayBalanceOpen(false);
          setPayBalanceBill(null);
        }}
        onSuccess={handlePayBalanceSuccess}
      />
    </AppShell>
  );
}
