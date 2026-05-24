export interface SheetRow {
  Month: string;
  Room: number | string;
  Rent: number | string;
  ElecPrev?: number | string;
  ElecCurr?: number | string;
  ElecRate?: number | string;
  ElecBill: number | string;
  WaterPrev?: number | string;
  WaterCurr?: number | string;
  WaterRate?: number | string;
  WaterBill: number | string;
  Adjustment?: number | string;
  Total?: number | string;
  TotalDue?: number | string;
  Paid?: number | string;
  Status: string;
}
