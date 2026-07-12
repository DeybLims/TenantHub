import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  KeyRound,
  Mail,
  NotebookPen,
  Phone,
  User,
} from "lucide-react";
import {
  formatExpenseAmount,
  formatLongDate,
  formatPesoDecimal,
} from "@/lib/format";
import { getTenantInitials } from "@/lib/tenantInitials";
import type { Tenant } from "@/components/tenants/types";

interface TenantExportReportProps {
  tenant: Tenant;
  generatedAt?: Date;
}

function ReportField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-navy">{value || "—"}</p>
    </div>
  );
}

function ReportCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof User;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
        <Icon className="h-4 w-4 text-blue-500" aria-hidden />
        <h3 className="text-sm font-bold text-blue-500">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function billingStatusColor(status: Tenant["status"]): string {
  if (status === "Paid") return "text-emerald-600";
  if (status === "Partial") return "text-orange-500";
  return "text-red-600";
}

export function TenantExportReport({
  tenant,
  generatedAt = new Date(),
}: TenantExportReportProps) {
  const timestamp = generatedAt.toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      id="tenant-export-report"
      className="mx-auto max-w-[820px] bg-white p-8 text-navy print:p-0"
    >
      <header className="mb-6 border-b-2 border-blue-500 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-500">TenantHub</p>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-sm font-bold tracking-wide text-blue-500">
              TENANT INFORMATION REPORT
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Generated on {timestamp}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white"
          aria-hidden
        >
          {getTenantInitials(tenant.name)}
        </div>
        <div>
          <h2 className="text-xl font-bold uppercase text-navy">{tenant.name}</h2>
          <p className="text-sm text-gray-500">Unit: {tenant.unitCode || "—"}</p>
          <span className="mt-2 inline-flex rounded-full border border-emerald-500 px-3 py-0.5 text-xs font-semibold text-emerald-600">
            Active Tenant
          </span>
        </div>
      </div>

      <div className="space-y-5">
        <ReportCard title="Contact Information" icon={User}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReportField icon={User} label="Full Name" value={tenant.name} />
            <ReportField
              icon={Phone}
              label="Contact Number"
              value={tenant.contactNumber}
            />
            <ReportField icon={Mail} label="Email Address" value={tenant.email} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <ReportField
              icon={User}
              label="Emergency Contact"
              value={tenant.emergencyContact}
            />
            <ReportField
              icon={Phone}
              label="Emergency Number"
              value={tenant.emergencyNumber}
            />
          </div>
        </ReportCard>

        <ReportCard title="Unit Information" icon={Building2}>
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-500">Lease Start</span>
              <span className="font-medium">
                {tenant.leaseStart ? formatLongDate(tenant.leaseStart) : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-500">Move-in Date</span>
              <span className="font-medium">
                {tenant.moveInDate ? formatLongDate(tenant.moveInDate) : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-500">Base Rent</span>
              <span className="font-medium">
                {formatExpenseAmount(tenant.baseRent)}
              </span>
            </div>
            <div className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-500">Deposit</span>
              <span className="font-medium">
                {formatExpenseAmount(tenant.deposit)}
              </span>
            </div>
          </div>
        </ReportCard>

        <ReportCard title="Billing Summary" icon={BarChart3}>
          <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-2 py-3 sm:pr-4">
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatPesoDecimal(tenant.currentBalance)}
              </p>
            </div>
            <div className="px-2 py-3 sm:pl-4">
              <p className="text-xs text-gray-500">Status</p>
              <p
                className={`mt-1 text-2xl font-bold ${billingStatusColor(tenant.status)}`}
              >
                {tenant.status}
              </p>
            </div>
            <div className="border-t border-gray-100 px-2 py-3 sm:col-span-1 sm:border-t-0 sm:pr-4">
              <p className="text-xs text-gray-500">Last Payment</p>
              <p className="mt-1 font-semibold text-navy">
                {tenant.lastPaymentDate
                  ? formatLongDate(tenant.lastPaymentDate)
                  : "—"}
              </p>
              {tenant.lastPaymentAmount > 0 && (
                <p className="text-sm text-gray-500">
                  {formatPesoDecimal(tenant.lastPaymentAmount)}
                </p>
              )}
            </div>
            <div className="px-2 py-3 sm:pl-4">
              <p className="text-xs text-gray-500">Next Due Date</p>
              <p className="mt-1 font-semibold text-navy">
                {tenant.nextDueDate
                  ? formatLongDate(tenant.nextDueDate)
                  : "—"}
              </p>
              {tenant.daysUntilDue != null && tenant.daysUntilDue >= 0 && (
                <p className="text-sm text-red-600">
                  {tenant.daysUntilDue} days left
                </p>
              )}
            </div>
          </div>
        </ReportCard>

        <ReportCard title="Notes" icon={NotebookPen}>
          <p className="text-sm italic text-gray-500">
            {tenant.notes.trim() || "Add notes here..."}
          </p>
        </ReportCard>
      </div>
    </div>
  );
}
