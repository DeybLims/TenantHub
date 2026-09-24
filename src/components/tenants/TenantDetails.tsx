"use client";

import {
  Building2,
  ChevronRight,
  FileText,
  Mail,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  formatLongDate,
  formatPesoDecimal,
} from "@/lib/format";
import { buildTenantBillingSummary } from "@/lib/tenantBillingSummary";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { TenantFormData } from "@/components/tenants/types";
import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import type { SheetRow } from "@/types/sheet";

export interface TenantDetailsProps {
  tenant: TenantTableRow;
  billingRows: SheetRow[];
  onSave?: (data: TenantFormData) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onExportPdf?: () => void;
  onBillingSummaryClick?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  saveError?: string | null;
  deleteError?: string | null;
}

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrencyField(value: string | number): string {
  const amount = readSheetNumber(String(value));
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-500" aria-hidden />
      <h4 className="text-sm font-bold text-navy">{title}</h4>
    </div>
  );
}

function IconField({
  icon: Icon,
  label,
  children,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div
        className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50"
        aria-hidden
      >
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50/40 p-4">
      <p className="mb-2 text-xs font-medium text-gray-500">{label}</p>
      <div>{children}</div>
    </div>
  );
}

export function TenantDetails({
  tenant,
  billingRows,
  onSave,
  onCancel,
  onDelete,
  onExportPdf,
  onBillingSummaryClick,
  isSaving = false,
  isDeleting = false,
  saveError = null,
  deleteError = null,
}: TenantDetailsProps) {
  const [name, setName] = useState(tenant.Name);
  const [contactNumber, setContactNumber] = useState(tenant.ContactNumber);
  const [email, setEmail] = useState(tenant.EmailAddress);
  const [emergencyContact, setEmergencyContact] = useState(
    tenant.EmergencyContact,
  );
  const [emergencyNumber, setEmergencyNumber] = useState(
    tenant.EmergencyNumber,
  );
  const [leaseStart, setLeaseStart] = useState(
    toDateInputValue(tenant.LeaseStart || tenant.MoveIn),
  );
  const [moveInDate, setMoveInDate] = useState(toDateInputValue(tenant.MoveIn));
  const [baseRent, setBaseRent] = useState(formatCurrencyField(tenant.Rent));
  const [deposit, setDeposit] = useState(formatCurrencyField(tenant.Deposit));
  const [notes, setNotes] = useState(tenant.Notes);

  useEffect(() => {
    setName(tenant.Name);
    setContactNumber(tenant.ContactNumber);
    setEmail(tenant.EmailAddress);
    setEmergencyContact(tenant.EmergencyContact);
    setEmergencyNumber(tenant.EmergencyNumber);
    setLeaseStart(toDateInputValue(tenant.LeaseStart || tenant.MoveIn));
    setMoveInDate(toDateInputValue(tenant.MoveIn));
    setBaseRent(formatCurrencyField(tenant.Rent));
    setDeposit(formatCurrencyField(tenant.Deposit));
    setNotes(tenant.Notes);
  }, [tenant]);

  const billingSummary = useMemo(
    () => buildTenantBillingSummary(billingRows, tenant.Room, tenant),
    [billingRows, tenant],
  );

  const savedForm = useMemo(
    () => ({
      name: tenant.Name,
      contactNumber: tenant.ContactNumber,
      email: tenant.EmailAddress,
      emergencyContact: tenant.EmergencyContact,
      emergencyNumber: tenant.EmergencyNumber,
      leaseStart: toDateInputValue(tenant.LeaseStart || tenant.MoveIn),
      moveInDate: toDateInputValue(tenant.MoveIn),
      baseRent: formatCurrencyField(tenant.Rent),
      deposit: formatCurrencyField(tenant.Deposit),
      notes: tenant.Notes,
    }),
    [tenant],
  );

  const isDirty = useMemo(() => {
    const current = {
      name,
      contactNumber,
      email,
      emergencyContact,
      emergencyNumber,
      leaseStart,
      moveInDate,
      baseRent,
      deposit,
      notes,
    };
    return JSON.stringify(current) !== JSON.stringify(savedForm);
  }, [
    name,
    contactNumber,
    email,
    emergencyContact,
    emergencyNumber,
    leaseStart,
    moveInDate,
    baseRent,
    deposit,
    notes,
    savedForm,
  ]);

  const resetForm = () => {
    setName(tenant.Name);
    setContactNumber(tenant.ContactNumber);
    setEmail(tenant.EmailAddress);
    setEmergencyContact(tenant.EmergencyContact);
    setEmergencyNumber(tenant.EmergencyNumber);
    setLeaseStart(toDateInputValue(tenant.LeaseStart || tenant.MoveIn));
    setMoveInDate(toDateInputValue(tenant.MoveIn));
    setBaseRent(formatCurrencyField(tenant.Rent));
    setDeposit(formatCurrencyField(tenant.Deposit));
    setNotes(tenant.Notes);
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.();
  };

  const handleDelete = () => {
    const tenantName = name.trim() || tenant.Name;
    const confirmed = window.confirm(
      `Remove ${tenantName} from ${tenant.UnitCode || `Room ${tenant.Room}`}? The unit will be marked Vacant so you can assign a new tenant.`,
    );
    if (!confirmed) return;
    onDelete?.();
  };

  const handleSave = () => {
    onSave?.({
      unitCode: tenant.UnitCode,
      name,
      contactNumber,
      email,
      emergencyContact,
      emergencyNumber,
      leaseStart,
      moveInDate,
      baseRent: String(readSheetNumber(baseRent)),
      deposit: String(readSheetNumber(deposit)),
      notes,
    });
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500 text-base font-bold text-white"
              aria-hidden
            >
              {getTenantInitials(name || tenant.Name)}
            </div>
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide text-navy">
                {name || tenant.Name}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                Unit: {tenant.UnitCode || "—"}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600">
            Active Tenant
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconField icon={User} label="Full Name">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Phone} label="Contact Number">
              <input
                type="tel"
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value)}
                placeholder="09 12 345 6789"
                autoComplete="tel"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Mail} label="Email Address" className="sm:col-span-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@email.com"
                autoComplete="email"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={User} label="Emergency Contact">
              <input
                type="text"
                value={emergencyContact}
                onChange={(event) => setEmergencyContact(event.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Phone} label="Emergency Number">
              <input
                type="tel"
                value={emergencyNumber}
                onChange={(event) => setEmergencyNumber(event.target.value)}
                placeholder="09 12 345 6789"
                autoComplete="off"
                className={fieldClass}
              />
            </IconField>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <SectionHeading icon={Building2} title="Unit Information" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Lease Start
              </label>
              <input
                type="date"
                value={leaseStart}
                onChange={(event) => setLeaseStart(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Move-in Date
              </label>
              <input
                type="date"
                value={moveInDate}
                onChange={(event) => setMoveInDate(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Base Rent
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  ₱
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={baseRent}
                  onChange={(event) => setBaseRent(event.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Deposit
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  ₱
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={deposit}
                  onChange={(event) => setDeposit(event.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <button
            type="button"
            onClick={onBillingSummaryClick}
            disabled={!onBillingSummaryClick}
            className="group w-full rounded-lg text-left transition-colors hover:bg-slate-50/80 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" aria-hidden />
                <h4 className="text-sm font-bold text-navy">Billing Summary</h4>
              </div>
              {onBillingSummaryClick && (
                <ChevronRight
                  className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500"
                  aria-hidden
                />
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SummaryCard label="Current Balance">
                <p className="text-2xl font-bold text-red-500">
                  {formatPesoDecimal(billingSummary.currentBalance)}
                </p>
              </SummaryCard>
              <SummaryCard label="Last Payment">
                {billingSummary.lastPaymentAmount > 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <span className="inline-flex rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Paid
                    </span>
                    <p className="mt-2 text-2xl font-bold text-navy">
                      {formatPesoDecimal(billingSummary.lastPaymentAmount)}
                    </p>
                    {billingSummary.lastPaymentDate && (
                      <p className="mt-1 text-sm text-gray-500">
                        {formatLongDate(billingSummary.lastPaymentDate)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-navy">—</p>
                )}
              </SummaryCard>
            </div>
          </button>
        </section>

        <section>
          <SectionHeading icon={FileText} title="Notes" />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Add notes here..."
            className={`${fieldClass} resize-none`}
          />
        </section>

        {(saveError || deleteError) && (
          <p className="text-sm text-red-500" role="alert">
            {saveError ?? deleteError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {isDirty && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving || isDeleting}
              className="text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting || !onDelete}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {isDeleting ? "Removing…" : "Remove Tenant"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isDeleting}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export to PDF
          </button>
        </div>
      </div>
    </article>
  );
}
