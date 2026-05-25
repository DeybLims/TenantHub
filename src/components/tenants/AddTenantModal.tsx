"use client";

import { X } from "lucide-react";

interface AddTenantModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTenantModal({ open, onClose }: AddTenantModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tenant-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-card">
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

        <div className="space-y-4 px-6 py-6">
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          </div>
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
          <p className="text-sm text-gray-500">
            Tenant form fields will be connected to your Google Sheet API next.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white opacity-60"
          >
            Save Tenant
          </button>
        </div>
      </div>
    </div>
  );
}
