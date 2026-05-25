"use client";

import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import { tenantDisplayStatusStyles } from "@/components/tenants/tenantStatusStyles";

interface TenantsTableProps {
  tenants: TenantTableRow[];
  selectedTenant: TenantTableRow | null;
  onSelectTenant: (tenant: TenantTableRow) => void;
}

export function TenantsTable({
  tenants,
  selectedTenant,
  onSelectTenant,
}: TenantsTableProps) {
  if (tenants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No tenants match your search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pr-4 font-medium text-gray-500">Unit Code</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Room</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Tenant Name</th>
            <th className="pb-3 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => {
            const isSelected = selectedTenant?.Room === tenant.Room;

            return (
              <tr
                key={`${tenant.UnitCode}-${tenant.Room}-${tenant.Name}`}
                onClick={() => onSelectTenant(tenant)}
                className={`cursor-pointer border-b border-gray-50 transition-colors last:border-0 hover:bg-slate-50 ${
                  isSelected ? "bg-slate-50" : ""
                }`}
              >
                <td className="py-4 pr-4 font-medium text-navy">
                  {tenant.UnitCode || "—"}
                </td>
                <td className="py-4 pr-4 text-gray-700">{tenant.Room}</td>
                <td className="py-4 pr-4 text-navy">{tenant.Name || "—"}</td>
                <td className="py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      tenantDisplayStatusStyles[tenant.displayStatus]
                    }`}
                  >
                    {tenant.displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
