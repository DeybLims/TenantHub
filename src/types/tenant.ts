export interface TenantRecord {
  UnitCode: string;
  Room: number;
  Name: string;
  Rent: number;
  MoveIn: string;
  Deposit: number;
  Status: string;
}

export type TenantStatus = "Active" | "Vacant";

export interface AssignTenantPayload {
  unitCode: string;
  room: string;
  name: string;
  rent: number;
  moveIn: string;
  deposit: number;
}

export interface DeleteTenantPayload {
  room: string;
  unitCode?: string;
}

/** @deprecated Use AssignTenantPayload */
export type SaveTenantPayload = AssignTenantPayload;
