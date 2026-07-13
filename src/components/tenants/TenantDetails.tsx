"use client";

import {
  BarChart3,
  Building2,
  Calendar,
  Mail,
  Pencil,
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
import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import type { TenantFormData } from "@/components/tenants/types";
import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import type { SheetRow } from "@/types/sheet";

export interface TenantDetailsProps {
  tenant: TenantTableRow;
  billing: SheetRow | undefined;
  selectedMonth: string;
  onSave?: (data: TenantFormData) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onExportPdf?: () => void;
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

function billingStatusClass(status: string): string {
  const label = normalizeBillingStatusLabel(status);
  if (label === "Paid") return "text-emerald-500";
  if (label === "Partial") return "text-orange-500";
  if (label === "Unpaid") return "text-red-500";
  return "text-gray-600";
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

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-gray-200 bg-gray-50/60 p-3">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function TenantDetails({
  tenant,
  billing,
  selectedMonth,
  onSave,
  onCancel,
  onDelete,
  onExportPdf,
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
    () => buildTenantBillingSummary(billing, selectedMonth),
    [billing, selectedMonth],
  );

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
      <div className="relative border-b border-gray-100 px-5 py-5">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          aria-label="Edit tenant"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 pr-10">
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
            <span className="mt-2 inline-flex rounded-full border border-emerald-500 px-3 py-0.5 text-xs font-semibold text-emerald-600">
              Active Tenant
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="rounded-lg border border-gray-200 p-4">
          <SectionHeading icon={User} title="Contact Information" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconField icon={User} label="Full Name">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Phone} label="Contact Number">
              <input
                type="text"
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value)}
                placeholder="09 12 345 6789"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Mail} label="Email Address" className="sm:col-span-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@email.com"
                className={fieldClass}
              />
            </IconField>
            <IconField icon={User} label="Emergency Contact">
              <input
                type="text"
                value={emergencyContact}
                onChange={(event) => setEmergencyContact(event.target.value)}
                className={fieldClass}
              />
            </IconField>
            <IconField icon={Phone} label="Emergency Number">
              <input
                type="text"
                value={emergencyNumber}
                onChange={(event) => setEmergencyNumber(event.target.value)}
                placeholder="09 12 345 6789"
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
              <div className="relative">
                <input
                  type="date"
                  value={leaseStart}
                  onChange={(event) => setLeaseStart(event.target.value)}
                  className={`${fieldClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Move-in Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(event) => setMoveInDate(event.target.value)}
                  className={`${fieldClass} pr-10`}
                />
                <Calendar
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              </div>
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
          <SectionHeading icon={BarChart3} title="Billing Summary" />
          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-lg border border-gray-200 sm:grid-cols-2">
            <SummaryCell label="Current Balance">
              <p className="text-lg font-bold text-red-500">
                {formatPesoDecimal(billingSummary.currentBalance)}
              </p>
            </SummaryCell>
            <SummaryCell label="Status">
              <p
                className={`text-lg font-bold ${billingStatusClass(billingSummary.status)}`}
              >
                {normalizeBillingStatusLabel(billingSummary.status)}
              </p>
            </SummaryCell>
            <SummaryCell label="Last Payment">
              <p className="font-semibold text-navy">
                {billingSummary.lastPaymentDate
                  ? formatLongDate(billingSummary.lastPaymentDate)
                  : "—"}
              </p>
              {billingSummary.lastPaymentAmount > 0 && (
                <p className="mt-0.5 text-gray-500">
                  {formatPesoDecimal(billingSummary.lastPaymentAmount)}
                </p>
              )}
            </SummaryCell>
            <SummaryCell label="Next Due Date">
              <p className="font-semibold text-navy">
                {billingSummary.nextDueDate
                  ? formatLongDate(billingSummary.nextDueDate)
                  : "—"}
              </p>
              {billingSummary.daysUntilDue != null &&
                billingSummary.daysUntilDue >= 0 && (
                  <p className="mt-0.5 text-sm text-red-500">
                    {billingSummary.daysUntilDue} days left
                  </p>
                )}
            </SummaryCell>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-bold text-navy">Notes</h4>
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSaving || isDeleting || !onDelete}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {isDeleting ? "Removing…" : "Remove Tenant"}
        </button>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving || isDeleting}
            className="text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-60"
          >
            Cancel
          </button>
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
