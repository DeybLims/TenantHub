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
