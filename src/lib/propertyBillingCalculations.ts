import { billingMonthsMatch, billingMonthKey } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

export const ELECTRICITY_SELLING_RATE = 14;
export const WATER_RATE_STANDARD = 45;
export const WATER_RATE_SPECIAL_JANUARY = 30;
export const WATER_RATE_SPECIAL_OTHER = 35;

export const SPECIAL_WATER_ROOMS = new Set([1, 8]);
export const RENTAL_ROOMS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const CORRECTION_MONTHS = new Set(["05", "5"]);

export interface UtilityProviderInputs {
  meralcoBillAmount: number;
  meralcoMainConsumption: number;
  miwdResidentialBill: number;
  miwdResidentialConsumption: number;
  miwdCommercialBill: number;
  miwdCommercialConsumption: number;
  jjcConsumption: number;
  aptMotorConsumption: number;
}

export interface ConsumptionWarning {
  room: number;
  utility: "electricity" | "water";
  previous: number;
  current: number;
  delta: number;
}

export interface RoomBillingCalculation {
  room: number;
  unitCode: string;
  tenantName: string;
  status: string;
  baseRent: number;
  elecPrev: number;
  elecCurr: number;
  elecConsumption: number;
  elecRate: number;
  elecBill: number;
  waterPrev: number;
  waterCurr: number;
  waterConsumption: number;
  waterRate: number;
  waterBill: number;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  elecConsumptionWarning: boolean;
  waterConsumptionWarning: boolean;
}

export interface MonthlyUtilityAnalytics {
  rooms: RoomBillingCalculation[];
  warnings: ConsumptionWarning[];
  sumBaseRent: number;
  sumElecBills: number;
  sumWaterBills: number;
  sumElecConsumption: number;
  sumWaterConsumption: number;
  sumGrandTotal: number;
  sumAmountPaid: number;
  sumBalance: number;
  meralcoTrueRate: number;
  miwdResidentialTrueRate: number;
  miwdCommercialTrueRate: number;
  averageWaterTrueRate: number;
  tenantElectricityTrueCost: number;
  aptMotorElectricityCost: number;
  jjcElectricityTrueCost: number;
  ebillNet: number;
  wbillNet: number;
  totalDueNet: number;
  actualWaterNet: number;
  totalActualWaterBills: number;
}

export interface YearlyBalanceCell {
  month: string;
  monthKey: string;
  balance: number;
}

export interface YearlyBalanceMatrix {
  year: number;
  months: string[];
  monthKeys: string[];
  rooms: number[];
  cells: Record<string, Record<number, number>>;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

function monthNumberKey(month: string): string {
  const key = billingMonthKey(month);
  if (!key) return "";
  return key.split("-")[1] ?? "";
}

export function isCorrectionMonth(month: string): boolean {
  const monthNum = monthNumberKey(month);
  return CORRECTION_MONTHS.has(monthNum);
}

/** Rooms 1 & 8: ₱30 in January; ₱35 Feb–Dec. All others: ₱45 all months. */
export function getWaterSellingRate(room: number, month: string): number {
  if (!SPECIAL_WATER_ROOMS.has(room)) {
    return WATER_RATE_STANDARD;
  }

  const monthNum = monthNumberKey(month);
  if (monthNum === "01" || monthNum === "1") {
    return WATER_RATE_SPECIAL_JANUARY;
  }

  return WATER_RATE_SPECIAL_OTHER;
}

export function calcConsumption(
  previous: number,
  current: number,
  allowNegative = false,
): number {
  const delta = current - previous;
  if (allowNegative) return delta;
  return Math.max(0, delta);
}

export function calcElectricityBill(consumption: number): number {
  return roundCurrency(consumption * ELECTRICITY_SELLING_RATE);
}

export function calcWaterBill(consumption: number, rate: number): number {
  return roundCurrency(consumption * rate);
}

export function calcGrandTotalDue(
  baseRent: number,
  elecBill: number,
  waterBill: number,
  isVacant: boolean,
): number {
  const rent = isVacant ? 0 : baseRent;
  return roundCurrency(rent + elecBill + waterBill);
}

export function calcRemainingBalance(grandTotal: number, amountPaid: number): number {
  return roundCurrency(grandTotal - amountPaid);
}

export function calcMeralcoTrueRate(
  billAmount: number,
  consumption: number,
): number {
  if (consumption <= 0) return 0;
  return roundCurrency(billAmount / consumption);
}

export function calcMiwdTrueRate(billAmount: number, consumption: number): number {
  if (consumption <= 0) return 0;
  return roundCurrency(billAmount / consumption);
}

export function calcAverageWaterTrueRate(
  residentialBill: number,
  commercialBill: number,
  residentialConsumption: number,
  commercialConsumption: number,
): number {
  const totalBill = residentialBill + commercialBill;
  const totalConsumption = residentialConsumption + commercialConsumption;
  if (totalConsumption <= 0) return 0;
  return roundCurrency(totalBill / totalConsumption);
}

export function defaultProviderInputs(): UtilityProviderInputs {
  return {
    meralcoBillAmount: 0,
    meralcoMainConsumption: 0,
    miwdResidentialBill: 0,
    miwdResidentialConsumption: 0,
    miwdCommercialBill: 0,
    miwdCommercialConsumption: 0,
    jjcConsumption: 0,
    aptMotorConsumption: 0,
  };
}

function tenantByRoom(tenants: TenantRecord[]): Map<number, TenantRecord> {
  return new Map(tenants.map((tenant) => [tenant.Room, tenant]));
}

function isVacantTenant(tenant: TenantRecord | undefined): boolean {
  if (!tenant) return true;
  return tenant.Status.trim().toLowerCase() === "vacant" || !tenant.Name.trim();
}

export function computeRoomBilling(
  row: SheetRow,
  tenant: TenantRecord | undefined,
  month: string,
): RoomBillingCalculation {
  const room = readRoom(row.Room);
  const allowNegative = isCorrectionMonth(month);
  const elecPrev = readSheetNumber(row.ElecPrev);
  const elecCurr = readSheetNumber(row.ElecCurr);
  const waterPrev = readSheetNumber(row.WaterPrev);
  const waterCurr = readSheetNumber(row.WaterCurr);

  const elecConsumption = calcConsumption(elecPrev, elecCurr, allowNegative);
  const waterConsumption = calcConsumption(waterPrev, waterCurr, allowNegative);
  const elecRate = ELECTRICITY_SELLING_RATE;
  const waterRate = getWaterSellingRate(room, month);

  const elecBill = roundCurrency(readSheetNumber(row.ElecBill) || calcElectricityBill(elecConsumption));
  const waterBill = roundCurrency(readSheetNumber(row.WaterBill) || calcWaterBill(waterConsumption, waterRate));

  const vacant = isVacantTenant(tenant);
  const baseRent = vacant ? 0 : readSheetNumber(row.Rent ?? tenant?.Rent ?? 0);
  const amountPaid = readSheetNumber(row.Paid);
  const grandTotal = calcGrandTotalDue(baseRent, elecBill, waterBill, vacant);
  const balance = calcRemainingBalance(grandTotal, amountPaid);

  const rawElecDelta = elecCurr - elecPrev;
  const rawWaterDelta = waterCurr - waterPrev;

  return {
    room,
    unitCode: tenant?.UnitCode ?? "",
    tenantName: tenant?.Name ?? "",
    status: vacant ? "Vacant" : "Active",
    baseRent,
    elecPrev,
    elecCurr,
    elecConsumption,
    elecRate,
    elecBill,
    waterPrev,
    waterCurr,
    waterConsumption,
    waterRate,
    waterBill,
    grandTotal,
    amountPaid,
    balance,
    elecConsumptionWarning: rawElecDelta < 0 && !allowNegative,
    waterConsumptionWarning: rawWaterDelta < 0 && !allowNegative,
  };
}

export function computeMonthlyUtilityAnalytics(
  billingRows: SheetRow[],
  tenants: TenantRecord[],
  month: string,
  provider: UtilityProviderInputs,
): MonthlyUtilityAnalytics {
  const tenantMap = tenantByRoom(tenants);
  const monthRows = billingRows.filter((row) => billingMonthsMatch(row.Month, month));

  const rowByRoom = new Map<number, SheetRow>();
  for (const row of monthRows) {
    const room = readRoom(row.Room);
    if (room >= 1 && room <= 8) {
      rowByRoom.set(room, row);
    }
  }

  const rooms: RoomBillingCalculation[] = RENTAL_ROOMS.map((room) => {
    const row = rowByRoom.get(room);
    if (row) {
      return computeRoomBilling(row, tenantMap.get(room), month);
    }

    const tenant = tenantMap.get(room);
    return {
      room,
      unitCode: tenant?.UnitCode ?? "",
      tenantName: tenant?.Name ?? "",
      status: isVacantTenant(tenant) ? "Vacant" : "Active",
      baseRent: 0,
      elecPrev: 0,
      elecCurr: 0,
      elecConsumption: 0,
      elecRate: ELECTRICITY_SELLING_RATE,
      elecBill: 0,
      waterPrev: 0,
      waterCurr: 0,
      waterConsumption: 0,
      waterRate: getWaterSellingRate(room, month),
      waterBill: 0,
      grandTotal: 0,
      amountPaid: 0,
      balance: 0,
      elecConsumptionWarning: false,
      waterConsumptionWarning: false,
    };
  });

  const warnings: ConsumptionWarning[] = [];
  for (const roomCalc of rooms) {
    if (roomCalc.elecConsumptionWarning) {
      warnings.push({
        room: roomCalc.room,
        utility: "electricity",
        previous: roomCalc.elecPrev,
        current: roomCalc.elecCurr,
        delta: roomCalc.elecCurr - roomCalc.elecPrev,
      });
    }
    if (roomCalc.waterConsumptionWarning) {
      warnings.push({
        room: roomCalc.room,
        utility: "water",
        previous: roomCalc.waterPrev,
        current: roomCalc.waterCurr,
        delta: roomCalc.waterCurr - roomCalc.waterPrev,
      });
    }
  }

  const sumBaseRent = roundCurrency(rooms.reduce((sum, row) => sum + row.baseRent, 0));
  const sumElecBills = roundCurrency(rooms.reduce((sum, row) => sum + row.elecBill, 0));
  const sumWaterBills = roundCurrency(rooms.reduce((sum, row) => sum + row.waterBill, 0));
  const sumElecConsumption = roundCurrency(
    rooms.reduce((sum, row) => sum + row.elecConsumption, 0),
  );
  const sumWaterConsumption = roundCurrency(
    rooms.reduce((sum, row) => sum + row.waterConsumption, 0),
  );
  const sumGrandTotal = roundCurrency(rooms.reduce((sum, row) => sum + row.grandTotal, 0));
  const sumAmountPaid = roundCurrency(rooms.reduce((sum, row) => sum + row.amountPaid, 0));
  const sumBalance = roundCurrency(rooms.reduce((sum, row) => sum + row.balance, 0));

  const meralcoTrueRate = calcMeralcoTrueRate(
    provider.meralcoBillAmount,
    provider.meralcoMainConsumption,
  );
  const miwdResidentialTrueRate = calcMiwdTrueRate(
    provider.miwdResidentialBill,
    provider.miwdResidentialConsumption,
  );
  const miwdCommercialTrueRate = calcMiwdTrueRate(
    provider.miwdCommercialBill,
    provider.miwdCommercialConsumption,
  );
  const averageWaterTrueRate = calcAverageWaterTrueRate(
    provider.miwdResidentialBill,
    provider.miwdCommercialBill,
    provider.miwdResidentialConsumption,
    provider.miwdCommercialConsumption,
  );

  const tenantElectricityTrueCost = roundCurrency(
    sumElecConsumption * meralcoTrueRate,
  );
  const aptMotorElectricityCost = roundCurrency(
    provider.aptMotorConsumption * meralcoTrueRate,
  );
  const jjcElectricityTrueCost = roundCurrency(
    provider.jjcConsumption * meralcoTrueRate,
  );

  const ebillNet = roundCurrency(sumElecBills - tenantElectricityTrueCost);

  const waterTrueCostComponent = roundCurrency(
    sumWaterConsumption * miwdResidentialTrueRate + aptMotorElectricityCost,
  );
  const wbillNet = roundCurrency(sumWaterBills - waterTrueCostComponent);

  const totalDueNet = roundCurrency(sumBaseRent + ebillNet + wbillNet);

  const totalActualWaterBills = roundCurrency(
    provider.miwdResidentialBill + provider.miwdCommercialBill,
  );
  const actualWaterNet = roundCurrency(
    sumWaterBills - (totalActualWaterBills + aptMotorElectricityCost),
  );

  return {
    rooms,
    warnings,
    sumBaseRent,
    sumElecBills,
    sumWaterBills,
    sumElecConsumption,
    sumWaterConsumption,
    sumGrandTotal,
    sumAmountPaid,
    sumBalance,
    meralcoTrueRate,
    miwdResidentialTrueRate,
    miwdCommercialTrueRate,
    averageWaterTrueRate,
    tenantElectricityTrueCost,
    aptMotorElectricityCost,
    jjcElectricityTrueCost,
    ebillNet,
    wbillNet,
    totalDueNet,
    actualWaterNet,
    totalActualWaterBills,
  };
}

export function computeYearlyBalanceMatrix(
  billingRows: SheetRow[],
  year: number,
): YearlyBalanceMatrix {
  const monthKeys = Array.from({ length: 12 }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  const monthLabels = monthKeys.map((monthNum) => {
    const date = new Date(year, Number(monthNum) - 1, 1);
    return date.toLocaleString("en-US", { month: "long" });
  });

  const cells: Record<string, Record<number, number>> = {};

  for (const monthKey of monthKeys) {
    cells[monthKey] = {};
    for (const room of RENTAL_ROOMS) {
      cells[monthKey][room] = 0;
    }
  }

  for (const row of billingRows) {
    const rowKey = billingMonthKey(row.Month);
    if (!rowKey.startsWith(`${year}-`)) continue;

    const monthKey = rowKey.split("-")[1];
    const room = readRoom(row.Room);
    if (!monthKey || room < 1 || room > 8) continue;

    const rent = readSheetNumber(row.Rent);
    const elecBill = readSheetNumber(row.ElecBill);
    const waterBill = readSheetNumber(row.WaterBill);
    const paid = readSheetNumber(row.Paid);
    const grandTotal = roundCurrency(rent + elecBill + waterBill);
    const balance = calcRemainingBalance(grandTotal, paid);

    cells[monthKey][room] = balance;
  }

  return {
    year,
    months: monthLabels,
    monthKeys,
    rooms: [...RENTAL_ROOMS],
    cells,
  };
}
