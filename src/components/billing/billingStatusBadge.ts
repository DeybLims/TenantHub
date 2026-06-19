import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";

const tableStatusStyles: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Unpaid: "bg-rose-100 text-rose-800",
  Partial: "bg-amber-100 text-amber-800",
  Vacant: "bg-slate-100 text-slate-600",
};

export function getBillingTableStatusClass(status: string): string {
  const label = normalizeBillingStatusLabel(status);
  return `inline-flex min-w-[4.5rem] justify-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
    tableStatusStyles[label] ?? tableStatusStyles.Unpaid
  }`;
}

export function getBillingTableStatusLabel(status: string): string {
  return normalizeBillingStatusLabel(status);
}
