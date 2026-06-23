import type { MonthOption } from "@/types/dashboard";
import type { ExpenseRecord } from "@/types/expense";

function parseExpenseDate(date: string): Date | null {
  if (!date) return null;

  const direct = new Date(date);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withDay = new Date(`${date} 1`);
  if (!Number.isNaN(withDay.getTime())) return withDay;

  return null;
}

/** Month key used for filtering (YYYY-MM). */
export function expenseMonthKey(date: string): string {
  const parsed = parseExpenseDate(date);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatExpenseMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function getExpenseMonthOptions(expenses: ExpenseRecord[]): MonthOption[] {
  const keys = [
    ...new Set(expenses.map((expense) => expenseMonthKey(expense.date))),
  ].filter(Boolean);

  return keys.sort().map((key) => ({
    value: key,
    label: formatExpenseMonthLabel(key),
  }));
}

export function getDefaultExpenseMonth(expenses: ExpenseRecord[]): string {
  const options = getExpenseMonthOptions(expenses);
  return options.at(-1)?.value ?? "";
}

export function filterExpensesByMonth(
  expenses: ExpenseRecord[],
  monthKey: string,
): ExpenseRecord[] {
  if (!monthKey) return expenses;
  return expenses.filter(
    (expense) => expenseMonthKey(expense.date) === monthKey,
  );
}
