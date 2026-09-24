"use client";

import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddTenantModal } from "@/components/tenants/AddTenantModal";
import { TenantDetails } from "@/components/tenants/TenantDetails";
import { TenantDetailPlaceholder } from "@/components/tenants/TenantDetailPlaceholder";
import { TenantsTable } from "@/components/tenants/TenantsTable";
import type { TenantFormData } from "@/components/tenants/types";
import { AppShell } from "@/components/layout/AppShell";
import {
  getDefaultBillingMonth,
  joinTenantsWithBilling,
  type TenantTableRow,
} from "@/lib/joinTenantsBilling";
import { mapTenantViewModel } from "@/lib/mapTenantViewModel";
import { printTenantReport } from "@/lib/printTenantReport";
import { buildTenantBillingSummary } from "@/lib/tenantBillingSummary";
import { isVacantTenant } from "@/lib/tenantRooms";
import { getVacantTenantSlots } from "@/lib/tenantRooms";
import { readSheetNumber } from "@/lib/readSheetNumber";
import {
  deleteTenant,
  fetchBillingRows,
  fetchTenants,
  getMockBillingRows,
  getMockTenants,
  updateTenantProfile,
} from "@/services/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export function TenantsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const vacantSlots = useMemo(
    () => (tenants ? getVacantTenantSlots(tenants) : []),
    [tenants],
  );

  useEffect(() => {
    if (!billingRows?.length || selectedMonth) return;
    setSelectedMonth(getDefaultBillingMonth(billingRows));
  }, [billingRows, selectedMonth]);

  const joinedTenants = useMemo(() => {
    if (!tenants || !billingRows || !selectedMonth) return [];
    return joinTenantsWithBilling(tenants, billingRows, selectedMonth);
  }, [tenants, billingRows, selectedMonth]);

  const activeTenants = useMemo(
    () => joinedTenants.filter((tenant) => !isVacantTenant(tenant)),
    [joinedTenants],
  );

  const selectedTenantRow = useMemo(() => {
    if (!selectedTenant) return null;
    return (
      activeTenants.find((tenant) => tenant.Room === selectedTenant.Room) ??
      null
    );
  }, [activeTenants, selectedTenant]);

  const selectedBillingSummary = useMemo(() => {
    if (!selectedTenantRow) return null;
    return buildTenantBillingSummary(
      billingRows ?? [],
      selectedTenantRow.Room,
      selectedTenantRow,
    );
  }, [selectedTenantRow, billingRows]);

  useEffect(() => {
    if (
      selectedTenant &&
      !activeTenants.some((tenant) => tenant.Room === selectedTenant.Room)
    ) {
      setSelectedTenant(null);
    }
  }, [activeTenants, selectedTenant]);

  useEffect(() => {
    if (selectedTenant || activeTenants.length === 0) return;
    setSelectedTenant(activeTenants[0]);
  }, [activeTenants, selectedTenant]);

  const isLoading = tenantsQuery.isLoading || billingQuery.isLoading;
  const isError = tenantsQuery.isError || billingQuery.isError;
  const error = tenantsQuery.error ?? billingQuery.error;

  const saveTenantMutation = useMutation({
    mutationFn: updateTenantProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      setSelectedTenant(null);
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleSelectTenant = (tenant: TenantTableRow) => {
    setSelectedTenant(tenant);
  };

  const handleSaveTenant = (data: TenantFormData) => {
    if (!selectedTenantRow) return;

    saveTenantMutation.mutate({
      room: String(selectedTenantRow.Room),
      unitCode: selectedTenantRow.UnitCode,
      name: data.name.trim(),
      contactNumber: data.contactNumber.trim(),
      emailAddress: data.email.trim(),
      emergencyContact: data.emergencyContact.trim(),
      emergencyNumber: data.emergencyNumber.trim(),
      leaseStart: data.leaseStart,
      moveIn: data.moveInDate,
      rent: readSheetNumber(data.baseRent),
      deposit: readSheetNumber(data.deposit),
      notes: data.notes.trim(),
    });
  };

  const handleDeleteTenant = () => {
    if (!selectedTenantRow) return;

    deleteTenantMutation.mutate({
      room: String(selectedTenantRow.Room),
      unitCode: selectedTenantRow.UnitCode,
    });
  };

  const handleExportPdf = () => {
    if (!selectedTenantRow || !selectedBillingSummary) return;
    const tenantView = mapTenantViewModel(
      selectedTenantRow,
      selectedBillingSummary,
    );
    printTenantReport(tenantView);
  };

  const handleBillingSummaryClick = () => {
    if (!selectedTenantRow) return;
    router.push(`/billing?room=${selectedTenantRow.Room}`);
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-navy">Tenants</h1>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add New
          </button>
        </div>
      </div>

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
        <p className="py-8 text-center text-sm text-red-500">
          {error instanceof Error ? error.message : "Failed to load tenants"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-7">
            <TenantsTable
              tenants={joinedTenants}
              selectedTenant={selectedTenantRow}
              onSelectTenant={handleSelectTenant}
            />
          </div>

          <div className="min-w-0 lg:col-span-5">
            {selectedTenantRow ? (
              <TenantDetails
                tenant={selectedTenantRow}
                billingRows={billingRows ?? []}
                onSave={handleSaveTenant}
                onDelete={handleDeleteTenant}
                isSaving={saveTenantMutation.isPending}
                isDeleting={deleteTenantMutation.isPending}
                saveError={
                  saveTenantMutation.error instanceof Error
                    ? saveTenantMutation.error.message
                    : null
                }
                deleteError={
                  deleteTenantMutation.error instanceof Error
                    ? deleteTenantMutation.error.message
                    : null
                }
                onExportPdf={handleExportPdf}
                onBillingSummaryClick={handleBillingSummaryClick}
              />
            ) : (
              <TenantDetailPlaceholder />
            )}
          </div>
        </div>
      )}

      <AddTenantModal
        open={isModalOpen}
        vacantSlots={vacantSlots}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["tenants"] });
          void queryClient.invalidateQueries({ queryKey: ["billing", "rows"] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
    </AppShell>
  );
}
