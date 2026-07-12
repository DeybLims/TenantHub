export type PaymentStatus = "Paid" | "Unpaid" | "Partial";

export type OccupancyStatus = "Active" | "Vacant";

export interface Tenant {
  id: string;
  room: number;
  unitCode: string;
  name: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  emergencyNumber: string;
  leaseStart: string;
  moveInDate: string;
  baseRent: number;
  deposit: number;
  notes: string;
  occupancyStatus: OccupancyStatus;
  status: PaymentStatus;
  currentBalance: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  nextDueDate: string | null;
  daysUntilDue: number | null;
}

export interface TenantFormData {
  unitCode: string;
  name: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  emergencyNumber: string;
  leaseStart: string;
  moveInDate: string;
  baseRent: string;
  deposit: string;
  notes: string;
}

export interface AddTenantFormData {
  unitCode: string;
  name: string;
  contactNumber: string;
  email: string;
  leaseStart: string;
  moveInDate: string;
  baseRent: string;
  deposit: string;
}
