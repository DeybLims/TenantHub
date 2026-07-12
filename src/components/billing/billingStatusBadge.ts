import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";

const tableStatusStyles: Record<string, string> = {
  Paid: "bg-emerald-400 text-white",
  Unpaid: "bg-red-500 text-white",
  Partial: "bg-orange-500 text-white",
  Vacant: "bg-gray-400 text-white",
};

export function getBillingTableStatusClass(status: string): string {
  const label = normalizeBillingStatusLabel(status);
  return `inline-flex min-w-[4.5rem] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
    tableStatusStyles[label] ?? tableStatusStyles.Unpaid
  }`;
}

export function getBillingTableStatusLabel(status: string): string {
  return normalizeBillingStatusLabel(status);
}
