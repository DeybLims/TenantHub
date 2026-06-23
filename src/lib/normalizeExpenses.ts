import type { ExpenseRecord } from "@/types/expense";

function isExpenseRow(row: unknown): row is Record<string, unknown> {
  return typeof row === "object" && row !== null && "Date" in row;
}

function readAmount(value: unknown): number {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toISOString().slice(0, 10);
}

export function normalizeExpenses(data: unknown): ExpenseRecord[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid expenses response: expected a JSON array");
  }

  if (data.length === 0) return [];

  return data
    .filter(isExpenseRow)
    .map((row, index) => ({
      id: String(row.id ?? row.ID ?? `${row.Date}-${index}`),
      date: normalizeDate(row.Date ?? row.date),
      category: String(row.Category ?? row.category ?? "Maintenance"),
      description: String(row.Description ?? row.description ?? ""),
      amount: readAmount(row.Amount ?? row.amount),
      status: String(row.Status ?? row.status ?? "Paid"),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getMockExpenses(): ExpenseRecord[] {
  return [
    {
      id: "exp-1",
      date: "2026-05-12",
      category: "Utilities",
      description: "JJC Consumption",
      amount: 10000,
      status: "Paid",
    },
    {
      id: "exp-2",
      date: "2026-05-08",
      category: "Maintenance",
      description: "Common area plumbing repair",
      amount: 3500,
      status: "Pending",
    },
    {
      id: "exp-3",
      date: "2026-05-05",
      category: "Supplies",
      description: "Cleaning supplies restock",
      amount: 1850,
      status: "Paid",
    },
    {
      id: "exp-4",
      date: "2026-05-02",
      category: "Utilities",
      description: "APT motor pump allocation",
      amount: 4200,
      status: "Paid",
    },
    {
      id: "exp-5",
      date: "2026-05-15",
      category: "Taxes",
      description: "Quarterly property tax installment",
      amount: 7500,
      status: "Pending",
    },
  ];
}
