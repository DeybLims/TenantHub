import { readSheetNumber } from "@/lib/readSheetNumber";
import type { SheetRow } from "@/types/sheet";

const APARTMENT_ROOMS = new Set([1, 2, 3, 4, 5, 6]);
const COMMERCIAL_ROOMS = new Set([7, 8]);

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

function isTenantRow(row: SheetRow): boolean {
  const room = readRoom(row.Room);
  return room >= 1 && room <= 99;
}

export interface UtilityDistributionSummary {
  totalElecBill: number;
  totalElecUsage: number;
  avgElecRate: number;
  totalWaterBill: number;
  totalWaterUsage: number;
  avgWaterRate: number;
  residentialWaterBill: number;
  commercialWaterBill: number;
  residentialWaterUsage: number;
  commercialWaterUsage: number;
  residentialElecBill: number;
  commercialElecBill: number;
  combinedUtilities: number;
  tenantCount: number;
}

function safeRate(bill: number, usage: number): number {
  if (usage <= 0) return 0;
  return bill / usage;
}

export function computeUtilityDistribution(
  billingRows: SheetRow[],
  selectedMonth: string,
): UtilityDistributionSummary {
  const rows = billingRows.filter(
    (row) => row.Month === selectedMonth && isTenantRow(row),
  );

  let totalElecBill = 0;
  let totalElecUsage = 0;
  let totalWaterBill = 0;
  let totalWaterUsage = 0;
  let residentialWaterBill = 0;
  let commercialWaterBill = 0;
  let residentialWaterUsage = 0;
  let commercialWaterUsage = 0;
  let residentialElecBill = 0;
  let commercialElecBill = 0;

  for (const row of rows) {
    const room = readRoom(row.Room);
    const elecBill = readSheetNumber(row.ElecBill);
    const elecUsage = Math.max(
      0,
      readSheetNumber(row.ElecCurr) - readSheetNumber(row.ElecPrev),
    );
    const waterBill = readSheetNumber(row.WaterBill);
    const waterUsage = Math.max(
      0,
      readSheetNumber(row.WaterCurr) - readSheetNumber(row.WaterPrev),
    );

    totalElecBill += elecBill;
    totalElecUsage += elecUsage;
    totalWaterBill += waterBill;
    totalWaterUsage += waterUsage;

    if (APARTMENT_ROOMS.has(room)) {
      residentialElecBill += elecBill;
      residentialWaterBill += waterBill;
      residentialWaterUsage += waterUsage;
    } else if (COMMERCIAL_ROOMS.has(room)) {
      commercialElecBill += elecBill;
      commercialWaterBill += waterBill;
      commercialWaterUsage += waterUsage;
    }
  }

  return {
    totalElecBill,
    totalElecUsage,
    avgElecRate: safeRate(totalElecBill, totalElecUsage),
    totalWaterBill,
    totalWaterUsage,
    avgWaterRate: safeRate(totalWaterBill, totalWaterUsage),
    residentialWaterBill,
    commercialWaterBill,
    residentialWaterUsage,
    commercialWaterUsage,
    residentialElecBill,
    commercialElecBill,
    combinedUtilities: totalElecBill + totalWaterBill,
    tenantCount: rows.length,
  };
}

export function formatUsage(value: number, decimals = 0): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatRate(value: number, decimals = 2): string {
  if (value <= 0) return "0.00";
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
