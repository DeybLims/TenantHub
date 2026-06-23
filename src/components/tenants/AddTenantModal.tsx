"use client";

import { useMutation } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { VacantTenantSlot } from "@/lib/tenantRooms";
import { assignTenant } from "@/services/api";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";

interface AddTenantModalProps {
  open: boolean;
  vacantSlots: VacantTenantSlot[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTenantModal({
  open,
  vacantSlots,
  onClose,
  onSuccess,
}: AddTenantModalProps) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasVacancy = vacantSlots.length > 0;

  const activeSlot = useMemo(() => {
    const room = Number(selectedRoom);
    return vacantSlots.find((slot) => slot.room === room) ?? vacantSlots[0];
  }, [selectedRoom, vacantSlots]);

  useEffect(() => {
    if (!open) return;
    setTenantName("");
    setBaseRent("");
    setDeposit("");
    setMoveInDate("");
    setError(null);
    setSelectedRoom(vacantSlots[0] ? String(vacantSlots[0].room) : "");
  }, [open, vacantSlots]);

  const mutation = useMutation({
    mutationFn: assignTenant,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!hasVacancy || !activeSlot) {
      setError("All 8 units are occupied. Remove a tenant before adding a new one.");
      return;
    }

    const trimmedName = tenantName.trim();
    if (!trimmedName) {
      setError("Tenant Name is required.");
      return;
    }
    if (!moveInDate) {
      setError("Move-in Date is required.");
      return;
    }

    mutation.mutate({
      unitCode: activeSlot.unitCode,
      room: String(activeSlot.room),
      name: trimmedName,
      rent: readSheetNumber(baseRent),
      deposit: readSheetNumber(deposit),
      moveIn: moveInDate,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tenant-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="add-tenant-title" className="text-lg font-semibold text-navy">
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
              All 8 rental units are currently occupied. Remove a tenant from an
              existing room before adding a new one.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {vacantSlots.length === 1 ? (
                <p>
                  Assigning to vacant{" "}
                  <span className="font-semibold">
                    Room {activeSlot?.room}
                  </span>
                  {activeSlot?.unitCode ? (
                    <>
                      {" "}
                      · Unit <span className="font-semibold">{activeSlot.unitCode}</span>
                    </>
                  ) : null}
                  . The existing vacant row will be updated and status set to
                  Active — no new row is added.
                </p>
              ) : (
                <p>
                  Select a vacant unit below. The vacant row will be updated and
                  status set to Active — no new row is added.
                </p>
              )}
            </div>
          )}

          {vacantSlots.length > 1 && (
            <FloatingLabelField label="Vacant Unit">
              <select
                value={selectedRoom}
                onChange={(event) => setSelectedRoom(event.target.value)}
                disabled={!hasVacancy}
                className={floatingInputClass}
              >
                {vacantSlots.map((slot) => (
                  <option key={slot.room} value={slot.room}>
                    Room {slot.room}
                    {slot.unitCode ? ` · ${slot.unitCode}` : ""}
                  </option>
                ))}
              </select>
            </FloatingLabelField>
          )}

          {hasVacancy && activeSlot && vacantSlots.length === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <FloatingLabelField label="Room">
                <input
                  type="text"
                  readOnly
                  value={`Room ${activeSlot.room}`}
                  className={`${floatingInputClass} cursor-not-allowed bg-gray-50`}
                />
              </FloatingLabelField>
              <FloatingLabelField label="Unit Code">
                <input
                  type="text"
                  readOnly
                  value={activeSlot.unitCode || "—"}
                  className={`${floatingInputClass} cursor-not-allowed bg-gray-50`}
                />
              </FloatingLabelField>
            </div>
          )}

          <FloatingLabelField label="Tenant Name">
            <input
              type="text"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="Value"
              disabled={!hasVacancy}
              className={floatingInputClass}
              autoFocus
            />
          </FloatingLabelField>

          <FloatingLabelField label="Base Rent">
            <input
              type="number"
              min={0}
              step="any"
              value={baseRent}
              onChange={(event) => setBaseRent(event.target.value)}
              placeholder="Value"
              disabled={!hasVacancy}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Deposit">
            <input
              type="number"
              min={0}
              step="any"
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
              placeholder="Value"
              disabled={!hasVacancy}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Move-in Date">
            <div className="relative">
              <input
                type="date"
                value={moveInDate}
                onChange={(event) => setMoveInDate(event.target.value)}
                disabled={!hasVacancy}
                className={`${floatingInputClass} pr-10`}
              />
              <Calendar
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            </div>
          </FloatingLabelField>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg bg-brand-coral px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !hasVacancy}
              className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Save Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
