"use client";

import { formatExpenseAmount, formatTableDate } from "@/lib/format";
import { isVacantTenant } from "@/lib/tenantRooms";
import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import { tenantDisplayStatusStyles } from "@/components/tenants/tenantStatusStyles";

interface TenantsTableProps {
  tenants: TenantTableRow[];
  selectedTenant: TenantTableRow | null;
  onSelectTenant: (tenant: TenantTableRow) => void;
}

function displayTenantName(name: string): string {
  if (!name.trim()) return "—";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayStatus(status: TenantTableRow["displayStatus"]): string {
  if (status === "No Bill") return "Unpaid";
  return status;
}

export function TenantsTable({
  tenants,
  selectedTenant,
  onSelectTenant,
}: TenantsTableProps) {
  const activeTenants = tenants.filter((tenant) => !isVacantTenant(tenant));

  if (activeTenants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No active tenants for this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-5 py-3.5 text-sm font-semibold text-navy">
              Unit Code/Tenant
            </th>
            <th className="px-4 py-3.5 text-sm font-semibold text-navy">Rent</th>
            <th className="px-4 py-3.5 text-sm font-semibold text-navy">
              Lease Start
            </th>
            <th className="px-4 py-3.5 text-sm font-semibold text-navy">
              Move-in Date
            </th>
            <th className="px-5 py-3.5 text-sm font-semibold text-navy">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {activeTenants.map((tenant) => {
            const isSelected = selectedTenant?.Room === tenant.Room;

            return (
              <tr
                key={`room-${tenant.Room}`}
                onClick={() => onSelectTenant(tenant)}
                className={`cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-slate-50/80 ${
                  isSelected ? "bg-slate-50" : "bg-white"
                }`}
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-navy">
                    {tenant.UnitCode || "—"}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {displayTenantName(tenant.Name)}
                  </p>
                </td>
                <td className="px-4 py-3.5 font-medium text-navy">
                  {formatExpenseAmount(tenant.Rent)}
                </td>
                <td className="px-4 py-3.5 text-gray-600">
                  {formatTableDate(tenant.LeaseStart || tenant.MoveIn)}
                </td>
                <td className="px-4 py-3.5 text-gray-600">
                  {formatTableDate(tenant.MoveIn)}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      tenantDisplayStatusStyles[tenant.displayStatus]
                    }`}
                  >
                    {displayStatus(tenant.displayStatus)}
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
