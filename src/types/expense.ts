export type ExpenseCategory =
  | "Maintenance"
  | "Utilities"
  | "Taxes"
  | "Supplies";

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  status?: "Paid" | "Pending" | "Unpaid" | string;
}

export interface SaveExpensePayload {
  date: string;
  category: string;
  description: string;
  amount: number;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Maintenance",
  "Utilities",
  "Taxes",
  "Supplies",
];
