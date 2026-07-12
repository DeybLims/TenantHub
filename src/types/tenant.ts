export interface TenantRecord {
  UnitCode: string;
  Room: number;
  Name: string;
  ContactNumber: string;
  EmailAddress: string;
  EmergencyContact: string;
  EmergencyNumber: string;
  LeaseStart: string;
  MoveIn: string;
  Rent: number;
  Deposit: number;
  Notes: string;
  Status: string;
}

export type TenantStatus = "Active" | "Vacant";

export interface AssignTenantPayload {
  unitCode: string;
  room: string;
  name: string;
  contactNumber?: string;
  emailAddress?: string;
  leaseStart?: string;
  rent: number;
  moveIn: string;
  deposit: number;
}

export interface UpdateTenantProfilePayload {
  room: string;
  unitCode: string;
  name: string;
  contactNumber: string;
  emailAddress: string;
  emergencyContact: string;
  emergencyNumber: string;
  leaseStart: string;
  moveIn: string;
  rent: number;
  deposit: number;
  notes: string;
}

export interface DeleteTenantPayload {
  room: string;
  unitCode?: string;
}

/** @deprecated Use AssignTenantPayload */
export type SaveTenantPayload = AssignTenantPayload;

export interface TenantProfileSaveData {
  name: string;
  contactNumber: string;
  emailAddress: string;
  emergencyContact: string;
  emergencyNumber: string;
  leaseStart: string;
  moveIn: string;
  baseRent: string;
  deposit: string;
  notes: string;
}
