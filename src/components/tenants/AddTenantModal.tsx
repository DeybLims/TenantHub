"use client";

import { useMutation } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { saveTenant } from "@/services/api";
import type { SaveTenantPayload } from "@/types/tenant";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";

interface AddTenantModalProps {
  open: boolean;
  vacantRooms: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddTenantModal({
  open,
  vacantRooms,
  onClose,
  onSuccess,
}: AddTenantModalProps) {
  const [unitCode, setUnitCode] = useState("");
  const [room, setRoom] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasVacancy = vacantRooms.length > 0;
  const singleVacantRoom = vacantRooms.length === 1 ? vacantRooms[0] : null;

  useEffect(() => {
    if (!open) return;
    setUnitCode("");
    setTenantName("");
    setBaseRent("");
    setDeposit("");
    setMoveInDate("");
    setError(null);
    setRoom(singleVacantRoom != null ? String(singleVacantRoom) : "");
  }, [open, singleVacantRoom]);

  useEffect(() => {
    if (!open || vacantRooms.length === 0) return;
    if (!vacantRooms.includes(Number(room))) {
      setRoom(String(vacantRooms[0]));
    }
  }, [open, vacantRooms, room]);

  const mutation = useMutation({
    mutationFn: (payload: SaveTenantPayload) => saveTenant(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!hasVacancy) {
      setError("All 8 units are occupied. Remove a tenant before adding a new one.");
      return;
    }

    const trimmedUnit = unitCode.trim();
    const trimmedName = tenantName.trim();
    const selectedRoom = Number(room);

    if (!vacantRooms.includes(selectedRoom)) {
      setError("Select a vacant room before saving.");
      return;
    }
    if (!trimmedUnit) {
      setError("Unit Code is required.");
      return;
    }
    if (!trimmedName) {
      setError("Tenant Name is required.");
      return;
    }

    mutation.mutate({
      unitCode: trimmedUnit,
      room: String(selectedRoom),
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
              {vacantRooms.length === 1
                ? `Assigning new tenant to vacant Room ${vacantRooms[0]}.`
                : `${vacantRooms.length} vacant rooms available. Select one below.`}
            </div>
          )}

          <FloatingLabelField label="Room">
            {vacantRooms.length > 1 ? (
              <select
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                disabled={!hasVacancy}
                className={floatingInputClass}
              >
                {vacantRooms.map((vacantRoom) => (
                  <option key={vacantRoom} value={vacantRoom}>
                    Room {vacantRoom}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={hasVacancy ? `Room ${room}` : "No vacant rooms"}
                className={`${floatingInputClass} cursor-not-allowed bg-gray-50`}
              />
            )}
          </FloatingLabelField>

          <FloatingLabelField label="Unit Code">
            <input
              type="text"
              value={unitCode}
              onChange={(event) => setUnitCode(event.target.value)}
              placeholder="Value"
              disabled={!hasVacancy}
              className={floatingInputClass}
              autoFocus
            />
          </FloatingLabelField>

          <FloatingLabelField label="Tenant Name">
            <input
              type="text"
              value={tenantName}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="Value"
              disabled={!hasVacancy}
              className={floatingInputClass}
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
