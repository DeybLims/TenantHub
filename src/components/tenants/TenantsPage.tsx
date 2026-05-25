"use client";

import { useQueries } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddTenantModal } from "@/components/tenants/AddTenantModal";
import { TenantDetailPanel } from "@/components/tenants/TenantDetailPanel";
import { TenantDetailPlaceholder } from "@/components/tenants/TenantDetailPlaceholder";
import { TenantsTable } from "@/components/tenants/TenantsTable";
import { MonthSelect } from "@/components/dashboard/MonthSelect";
import { AppShell } from "@/components/layout/AppShell";
import {
  findTenantBillingRow,
  getBillingMonthOptions,
  getDefaultBillingMonth,
  joinTenantsWithBilling,
  type TenantTableRow,
} from "@/lib/joinTenantsBilling";
import {
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockTenants,
} from "@/services/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function TenantsPage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantTableRow | null>(
    null,
  );

  const [tenantsQuery, billingQuery] = useQueries({
    queries: [
      {
        queryKey: ["tenants"],
        queryFn: () =>
          USE_MOCK ? Promise.resolve(getMockTenants()) : fetchTenants(),
      },
      {
        queryKey: ["billing", "rows"],
        queryFn: () =>
          USE_MOCK ? Promise.resolve(getMockBillingRows()) : fetchBillingRows(),
      },
    ],
  });

  const tenants = tenantsQuery.data;
  const billingRows = billingQuery.data;

  const monthOptions = useMemo(
    () => (billingRows ? getBillingMonthOptions(billingRows) : []),
    [billingRows],
  );

  useEffect(() => {
    if (!billingRows?.length || selectedMonth) return;
    setSelectedMonth(getDefaultBillingMonth(billingRows));
  }, [billingRows, selectedMonth]);

  const joinedTenants = useMemo(() => {
    if (!tenants || !billingRows || !selectedMonth) return [];
    return joinTenantsWithBilling(tenants, billingRows, selectedMonth);
  }, [tenants, billingRows, selectedMonth]);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return joinedTenants;

    return joinedTenants.filter((tenant) => {
      const unitMatch = tenant.UnitCode.toLowerCase().includes(query);
      const nameMatch = tenant.Name.toLowerCase().includes(query);
      const roomMatch = String(tenant.Room).includes(query);
      return unitMatch || nameMatch || roomMatch;
    });
  }, [joinedTenants, search]);

  const selectedTenantRow = useMemo(() => {
    if (!selectedTenant) return null;
    return (
      joinedTenants.find((tenant) => tenant.Room === selectedTenant.Room) ?? null
    );
  }, [joinedTenants, selectedTenant]);

  const selectedBilling = useMemo(() => {
    if (!selectedTenantRow || !billingRows || !selectedMonth) {
      return undefined;
    }
    return findTenantBillingRow(
      billingRows,
      selectedTenantRow.Room,
      selectedMonth,
    );
  }, [selectedTenantRow, billingRows, selectedMonth]);

  useEffect(() => {
    if (
      selectedTenant &&
      !filteredTenants.some((tenant) => tenant.Room === selectedTenant.Room)
    ) {
      setSelectedTenant(null);
    }
  }, [filteredTenants, selectedTenant]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  const handleSelectTenant = (tenant: TenantTableRow) => {
    setSelectedTenant(tenant);
  };

  return (
    <AppShell>
      <article className="rounded-xl bg-surface-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h1 className="text-xl font-bold text-navy sm:text-2xl">
            Tenants Database
          </h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MonthSelect
              months={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              disabled={isLoading || monthOptions.length === 0}
            />

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, unit code, or room…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 sm:w-64"
                aria-label="Search tenants"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add New Tenant
            </button>
          </div>
        </div>

        <div className="px-5 py-4 sm:px-6">
          {isLoading && (
            <div className="space-y-3 py-6" aria-hidden>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          )}

          {isError && (
            <p className="py-8 text-center text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : "Failed to load tenants"}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 lg:w-2/3">
                <TenantsTable
                  tenants={filteredTenants}
                  selectedTenant={selectedTenantRow}
                  onSelectTenant={handleSelectTenant}
                />
              </div>

              <div className="min-w-0 lg:w-1/3">
                {selectedTenantRow ? (
                  <TenantDetailPanel
                    tenant={selectedTenantRow}
                    billing={selectedBilling}
                    selectedMonth={selectedMonth}
                    onClose={() => setSelectedTenant(null)}
                  />
                ) : (
                  <TenantDetailPlaceholder />
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      <AddTenantModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </AppShell>
  );
}
