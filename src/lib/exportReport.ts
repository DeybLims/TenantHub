import { formatMonthLabel } from "@/lib/months";
import type { DashboardData } from "@/types/dashboard";
import type { SheetRow } from "@/types/sheet";

const TENANT_COLUMNS: (keyof SheetRow)[] = [
  "Month",
  "Room",
  "Rent",
  "ElecPrev",
  "ElecCurr",
  "ElecRate",
  "ElecBill",
  "WaterPrev",
  "WaterCurr",
  "WaterRate",
  "WaterBill",
  "Adjustment",
  "TotalDue",
  "Total",
  "Paid",
  "Status",
];

function escapeCsvCell(value: unknown): string {
  const text = value == null || value === "" ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowToCsvLine(headers: string[], row: Record<string, unknown>): string {
  return headers.map((header) => escapeCsvCell(row[header])).join(",");
}

function sheetRowToRecord(row: SheetRow): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of TENANT_COLUMNS) {
    record[key] = row[key] ?? "";
  }
  return record;
}

function slugifyMonth(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildMonthReportCsv(data: DashboardData): string {
  const monthLabel =
    data.availableMonths.find((m) => m.value === data.activeMonth)?.label ??
    formatMonthLabel(data.activeMonth);

  const lines: string[] = [
    "TenantHub Monthly Report",
    `Reporting Period,${escapeCsvCell(monthLabel)}`,
    "",
    "Dashboard Summary",
    "Metric,Amount (PHP)",
    `Revenue,${data.kpis.revenue}`,
    `Utility Charges,${data.kpis.utilityCharges}`,
    `Property Expenses,${data.kpis.propertyExpenses}`,
    `Net Income,${data.kpis.netIncome}`,
    "",
    "Payment Overview",
    "Metric,Amount (PHP)",
    `Collection,${data.paymentStatus.collected}`,
    `Outstanding,${data.paymentStatus.outstanding}`,
    "",
    "Properties",
    "Type,Occupied,Total Units",
    ...data.properties.map(
      (p) =>
        `${escapeCsvCell(p.label)},${p.occupied},${p.total}`,
    ),
    "",
    "Operating Expenses",
    "Utility,Total Bill,Allocated Amount,Remaining Balance,Status",
    ...data.utilities.map(
      (u) =>
        [
          escapeCsvCell(u.utility),
          u.totalBill,
          u.allocatedAmount,
          u.remainingBalance,
          escapeCsvCell(u.status),
        ].join(","),
    ),
    "",
    "Tenant Billing",
    TENANT_COLUMNS.join(","),
  ];

  const tenantRecords = data.reportSheetRows.map(sheetRowToRecord);
  for (const record of tenantRecords) {
    lines.push(rowToCsvLine([...TENANT_COLUMNS], record));
  }

  return lines.join("\r\n");
}

export function downloadMonthReportCsv(data: DashboardData): void {
  const monthLabel =
    data.availableMonths.find((m) => m.value === data.activeMonth)?.label ??
    formatMonthLabel(data.activeMonth);

  const csv = buildMonthReportCsv(data);
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tenanthub-report-${slugifyMonth(monthLabel) || "month"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
