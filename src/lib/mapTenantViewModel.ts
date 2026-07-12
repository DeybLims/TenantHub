import type { TenantTableRow } from "@/lib/joinTenantsBilling";
import { normalizeBillingStatusLabel } from "@/components/tenants/tenantStatusStyles";
import type { PaymentStatus, Tenant } from "@/components/tenants/types";
import type { TenantBillingSummary } from "@/lib/tenantBillingSummary";

function toPaymentStatus(displayStatus: string): PaymentStatus {
  const label = normalizeBillingStatusLabel(displayStatus);
  if (label === "Paid" || label === "Partial") return label;
  return "Unpaid";
}

export function mapTenantViewModel(
  row: TenantTableRow,
  billingSummary: TenantBillingSummary,
): Tenant {
  return {
    id: `room-${row.Room}`,
    room: row.Room,
    unitCode: row.UnitCode,
    name: row.Name,
    contactNumber: row.ContactNumber,
    email: row.EmailAddress,
    emergencyContact: row.EmergencyContact,
    emergencyNumber: row.EmergencyNumber,
    leaseStart: row.LeaseStart || row.MoveIn,
    moveInDate: row.MoveIn,
    baseRent: row.Rent,
    deposit: row.Deposit,
    notes: row.Notes,
    occupancyStatus: row.Status === "Vacant" ? "Vacant" : "Active",
    status: toPaymentStatus(billingSummary.status),
    currentBalance: billingSummary.currentBalance,
    lastPaymentDate: billingSummary.lastPaymentDate,
    lastPaymentAmount: billingSummary.lastPaymentAmount,
    nextDueDate: billingSummary.nextDueDate,
    daysUntilDue: billingSummary.daysUntilDue,
  };
}
