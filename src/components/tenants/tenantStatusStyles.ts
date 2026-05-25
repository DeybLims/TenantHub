import type { TenantDisplayStatus } from "@/lib/joinTenantsBilling";

export const tenantDisplayStatusStyles: Record<TenantDisplayStatus, string> = {
  Vacant: "bg-gray-100 text-gray-700",
  Paid: "bg-emerald-100 text-emerald-800",
  Unpaid: "bg-red-100 text-red-800",
  Partial: "bg-orange-100 text-orange-800",
  "No Bill": "bg-blue-100 text-blue-800",
};

export type BillingStatusLabel = "Paid" | "Unpaid" | "Partial" | "Vacant";

const billingStatusPillColors: Record<BillingStatusLabel, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Unpaid: "bg-rose-100 text-rose-800",
  Partial: "bg-amber-100 text-amber-800",
  Vacant: "bg-slate-100 text-slate-600",
};

export const billingStatusPillBaseClass =
  "w-full rounded-lg py-2.5 text-center text-sm font-bold uppercase tracking-wide";

export function normalizeBillingStatusLabel(status: string): BillingStatusLabel {
  const value = status.trim().toLowerCase();
  if (value === "paid") return "Paid";
  if (value === "unpaid") return "Unpaid";
  if (value === "partial") return "Partial";
  if (value === "vacant") return "Vacant";
  return "Unpaid";
}

export function getBillingStatusPillClass(status: string): string {
  const label = normalizeBillingStatusLabel(status);
  return `${billingStatusPillBaseClass} ${billingStatusPillColors[label]}`;
}
