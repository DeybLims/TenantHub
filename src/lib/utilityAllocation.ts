import { formatMonthLabel } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { expenseMonthKey } from "@/lib/expenseMonths";
import type { ExpenseRecord, SaveExpensePayload } from "@/types/expense";
import type { SheetRow } from "@/types/sheet";

export const UTILITY_CATEGORIES = {
  motor: "Utility - APT Motor",
  jjc: "Utility - JJC",
  tenants: "Utility - Tenants",
} as const;

export type UtilityCategory =
  (typeof UTILITY_CATEGORIES)[keyof typeof UTILITY_CATEGORIES];

export interface MotorAllocation {
  kilowatts: number;
  rate: number;
  total: number;
}

export interface SplitAllocation {
  electricity: number;
  water: number;
  total: number;
}

function expenseMatchesMonth(
  expense: ExpenseRecord,
  billingMonth: string,
): boolean {
  const monthLabel = formatMonthLabel(billingMonth);
  if (expense.date.includes(monthLabel)) return true;

  const expenseKey = expenseMonthKey(expense.date);
  const billingKey = expenseMonthKey(
    new Date(billingMonth).toISOString().slice(0, 10),
  );

  return expenseKey !== "" && expenseKey === billingKey;
}

export function findUtilityExpense(
  expenses: ExpenseRecord[],
  category: UtilityCategory,
  billingMonth: string,
): ExpenseRecord | undefined {
  return expenses.find(
    (expense) =>
      expense.category === category && expenseMatchesMonth(expense, billingMonth),
  );
}

export function isUtilityAllocationSaved(
  expenses: ExpenseRecord[],
  billingMonth: string,
): boolean {
  return (
    !!findUtilityExpense(expenses, UTILITY_CATEGORIES.motor, billingMonth) &&
    !!findUtilityExpense(expenses, UTILITY_CATEGORIES.jjc, billingMonth) &&
    !!findUtilityExpense(expenses, UTILITY_CATEGORIES.tenants, billingMonth)
  );
}

export function parseMotorAllocation(
  expense: ExpenseRecord | undefined,
): MotorAllocation {
  if (!expense) {
    return { kilowatts: 0, rate: 14, total: 0 };
  }

  const match = expense.description.match(
    /([\d,.]+)\s*KW\s*@\s*([\d,.]+)/i,
  );
  const kilowatts = match ? readSheetNumber(match[1]) : 0;
  const rate = match ? readSheetNumber(match[2]) : 14;
  const total = expense.amount || kilowatts * rate;

  return { kilowatts, rate: rate || 14, total };
}

export function parseSplitAllocation(
  expense: ExpenseRecord | undefined,
): SplitAllocation {
  if (!expense) {
    return { electricity: 0, water: 0, total: 0 };
  }

  const elecMatch = expense.description.match(/Electricity:\s*([\d,.]+)/i);
  const waterMatch = expense.description.match(/Water:\s*([\d,.]+)/i);
  const electricity = elecMatch
    ? readSheetNumber(elecMatch[1])
    : expense.amount;
  const water = waterMatch ? readSheetNumber(waterMatch[1]) : 0;

  return {
    electricity,
    water,
    total: expense.amount || electricity + water,
  };
}

export function sumTenantBillingUtilities(
  billingRows: SheetRow[],
  billingMonth: string,
): SplitAllocation {
  const rows = billingRows.filter((row) => row.Month === billingMonth);

  const electricity = rows.reduce(
    (sum, row) => sum + readSheetNumber(row.ElecBill),
    0,
  );
  const water = rows.reduce(
    (sum, row) => sum + readSheetNumber(row.WaterBill),
    0,
  );

  return { electricity, water, total: electricity + water };
}

export function buildMotorPayload(
  billingMonth: string,
  kilowatts: number,
  rate: number,
): SaveExpensePayload {
  const amount = kilowatts * rate;
  return {
    date: formatMonthLabel(billingMonth),
    category: UTILITY_CATEGORIES.motor,
    description: `Pump Consumption: ${kilowatts} KW @ ${rate}`,
    amount,
  };
}

export function buildJjcPayload(
  billingMonth: string,
  electricity: number,
  water: number,
): SaveExpensePayload {
  return {
    date: formatMonthLabel(billingMonth),
    category: UTILITY_CATEGORIES.jjc,
    description: `JJC Electricity: ${electricity} | Water: ${water}`,
    amount: electricity + water,
  };
}

export function buildTenantsPayload(
  billingMonth: string,
  electricity: number,
  water: number,
): SaveExpensePayload {
  return {
    date: formatMonthLabel(billingMonth),
    category: UTILITY_CATEGORIES.tenants,
    description: `Tenant billing sync — Electricity: ${electricity} | Water: ${water}`,
    amount: electricity + water,
  };
}
