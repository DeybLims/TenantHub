"use client";

import { useMutation } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { VacantTenantSlot } from "@/lib/tenantRooms";
import { assignTenant } from "@/services/api";
import type { AddTenantFormData } from "@/components/tenants/types";

interface AddTenantModalProps {
  open: boolean;
  vacantSlots: VacantTenantSlot[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1 block text-xs font-medium text-gray-500">
      {children}
    </label>
  );
}

const emptyForm = (): AddTenantFormData => ({
  unitCode: "",
  name: "",
  contactNumber: "",
  email: "",
  leaseStart: "",
  moveInDate: "",
  baseRent: "",
  deposit: "",
});

export function AddTenantModal({
  open,
  vacantSlots,
  onClose,
  onSuccess,
}: AddTenantModalProps) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const [form, setForm] = useState<AddTenantFormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const hasVacancy = vacantSlots.length > 0;

  const activeSlot = useMemo(() => {
    const room = Number(selectedRoom);
    return vacantSlots.find((slot) => slot.room === room) ?? vacantSlots[0];
  }, [selectedRoom, vacantSlots]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError(null);
    setSelectedRoom(vacantSlots[0] ? String(vacantSlots[0].room) : "");
  }, [open, vacantSlots]);

  useEffect(() => {
    if (!open || !activeSlot) return;
    setForm((current) => ({
      ...current,
      unitCode: activeSlot.unitCode || current.unitCode,
    }));
  }, [open, activeSlot]);

  const mutation = useMutation({
    mutationFn: assignTenant,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateField = <K extends keyof AddTenantFormData>(
    key: K,
    value: AddTenantFormData[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!hasVacancy || !activeSlot) {
      setError(
        "All 8 units are occupied. Remove a tenant before adding a new one.",
      );
      return;
    }

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Tenant Name is required.");
      return;
    }
    if (!form.moveInDate) {
      setError("Move-in Date is required.");
      return;
    }

    mutation.mutate({
      unitCode: form.unitCode.trim() || activeSlot.unitCode,
      room: String(activeSlot.room),
      name: trimmedName,
      contactNumber: form.contactNumber.trim(),
      emailAddress: form.email.trim(),
      leaseStart: form.leaseStart || form.moveInDate,
      rent: readSheetNumber(form.baseRent),
      deposit: readSheetNumber(form.deposit),
      moveIn: form.moveInDate,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tenant-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="add-tenant-title" className="text-lg font-bold text-navy">
            Add New Tenant
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {!hasVacancy ? (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              All 8 rental units are currently occupied. Remove a tenant before
              adding a new one.
            </div>
          ) : vacantSlots.length > 1 ? (
            <div>
              <FieldLabel>Vacant Unit</FieldLabel>
              <select
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
                className={inputClass}
              >
                {vacantSlots.map((slot) => (
                  <option key={slot.room} value={slot.room}>
                    Room {slot.room}
                    {slot.unitCode ? ` · ${slot.unitCode}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Unit Code</FieldLabel>
              <input
                type="text"
                value={form.unitCode}
                onChange={(event) => updateField("unitCode", event.target.value)}
                placeholder="APT-101"
                disabled={!hasVacancy}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Tenant Name</FieldLabel>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Joel"
                disabled={!hasVacancy}
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <FieldLabel>Contact Number</FieldLabel>
              <input
                type="text"
                value={form.contactNumber}
                onChange={(event) =>
                  updateField("contactNumber", event.target.value)
                }
                placeholder="09 12 345 6789"
                disabled={!hasVacancy}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="joel@gmail.com"
                disabled={!hasVacancy}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Lease Start</FieldLabel>
              <div className="relative">
                <input
                  type="date"
                  value={form.leaseStart}
                  onChange={(event) =>
                    updateField("leaseStart", event.target.value)
                  }
                  disabled={!hasVacancy}
                  className={`${inputClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <FieldLabel>Move-in Date</FieldLabel>
              <div className="relative">
                <input
                  type="date"
                  value={form.moveInDate}
                  onChange={(event) =>
                    updateField("moveInDate", event.target.value)
                  }
                  disabled={!hasVacancy}
                  required
                  className={`${inputClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>Base Rent</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                ₱
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.baseRent}
                onChange={(event) => updateField("baseRent", event.target.value)}
                placeholder="10,000.00"
                disabled={!hasVacancy}
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Deposit</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                ₱
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.deposit}
                onChange={(event) => updateField("deposit", event.target.value)}
                placeholder="10,000.00"
                disabled={!hasVacancy}
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !hasVacancy}
              className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Save Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
