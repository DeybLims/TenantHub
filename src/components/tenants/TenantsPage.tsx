"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AddTenantModal } from "@/components/tenants/AddTenantModal";
import { TenantsTable } from "@/components/tenants/TenantsTable";
import { AppShell } from "@/components/layout/AppShell";
import { fetchTenants, getMockTenants } from "@/services/api";
import type { TenantRecord } from "@/types/tenant";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function TenantsPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => (USE_MOCK ? Promise.resolve(getMockTenants()) : fetchTenants()),
  });

  const filteredTenants = useMemo(() => {
    if (!data) return [];

    const query = search.trim().toLowerCase();
    if (!query) return data;

    return data.filter((tenant) => {
      const unitMatch = tenant.UnitCode.toLowerCase().includes(query);
      const nameMatch = tenant.Name.toLowerCase().includes(query);
      return unitMatch || nameMatch;
    });
  }, [data, search]);

  const handleDelete = (tenant: TenantRecord) => {
    window.alert(
      `Delete for ${tenant.Name} (${tenant.UnitCode || `Room ${tenant.Room}`}) will connect to your API later.`,
    );
  };

  return (
    <AppShell>
      <article className="rounded-xl bg-surface-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h1 className="text-xl font-bold text-navy sm:text-2xl">
            Tenants Database
          </h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or unit code…"
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
              {error instanceof Error ? error.message : "Failed to load tenants"}
            </p>
          )}

          {!isLoading && !isError && (
            <TenantsTable tenants={filteredTenants} onDelete={handleDelete} />
          )}
        </div>
      </article>

      <AddTenantModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </AppShell>
  );
}
