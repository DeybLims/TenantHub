import { Trash2 } from "lucide-react";
import { formatMoveInDate, formatPesoDecimal } from "@/lib/format";
import type { TenantRecord } from "@/types/tenant";

interface TenantsTableProps {
  tenants: TenantRecord[];
  onDelete?: (tenant: TenantRecord) => void;
}

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  Vacant: "bg-gray-100 text-gray-700",
};

export function TenantsTable({ tenants, onDelete }: TenantsTableProps) {
  if (tenants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No tenants match your search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-4 font-medium text-gray-500">Unit Code</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Tenant Name</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Base Rent</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Deposit</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Move-in Date</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Status</th>
            <th className="pb-3 text-center font-medium text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr
              key={`${tenant.UnitCode}-${tenant.Room}-${tenant.Name}`}
              className="border-b border-gray-50 last:border-0"
            >
              <td className="py-4 pr-4 font-medium text-navy">
                {tenant.UnitCode || "—"}
              </td>
              <td className="py-4 pr-4 text-navy">
                {tenant.Name || "—"}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatPesoDecimal(tenant.Rent)}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatPesoDecimal(tenant.Deposit)}
              </td>
              <td className="py-4 pr-4 text-gray-700">
                {formatMoveInDate(tenant.MoveIn)}
              </td>
              <td className="py-4 pr-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[tenant.Status] ?? statusStyles.Vacant
                  }`}
                >
                  {tenant.Status}
                </span>
              </td>
              <td className="py-4 text-center">
                <button
                  type="button"
                  onClick={() => onDelete?.(tenant)}
                  className="inline-flex rounded-lg p-2 text-brand-coral transition-colors hover:bg-red-50"
                  aria-label={`Delete ${tenant.Name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
