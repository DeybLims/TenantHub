export type UtilityPaymentStatus = "Paid" | "Unpaid";

/**
 * Manual inputs only — matches spreadsheet rows 13–17 (Amount/Consumption)
 * and sub-meter readings rows 30–31 (Prev/Curr).
 * True rates and consumption deltas are always calculated.
 */
export interface ExpenseRecord {
  billingMonth: string;
  paidToUtility: boolean;
  meralcoAmount: number;
  meralcoConsumption: number;
  miwdResidentialAmount: number;
  miwdResidentialConsumption: number;
  miwdCommercialAmount: number;
  miwdCommercialConsumption: number;
  aptMotorElecPrev: number;
  aptMotorElecCurr: number;
  jjcElecPrev: number;
  jjcElecCurr: number;
}

export interface UtilityExpenseDerived {
  meralcoTrueRate: number;
  miwdResidentialTrueRate: number;
  miwdCommercialTrueRate: number;
  averageWaterAmount: number;
  averageWaterConsumption: number;
  averageWaterTrueRate: number;
  aptMotorConsumptionKwh: number;
  aptMotorTrueCost: number;
  jjcConsumptionKwh: number;
  jjcTrueCost: number;
  electricitySellingRate: number;
  waterStandardSellingRate: number;
  specialWaterRate: number;
}

export interface UtilityExpenseAnalytics {
  derived: UtilityExpenseDerived;
  tenantTotalConsumptionKwh: number;
  tenantTotalBilled: number;
  tenantElectricityTrueCost: number;
  netElectricityProfit: number;
  tenantWaterRevenue: number;
  trueTenantWaterCost: number;
  netWaterProfit: number;
  miwdResidentialAmount: number;
  miwdCommercialAmount: number;
  totalDueNet: number;
  warnings: Array<{
    room: number;
    utility: string;
    delta: number;
  }>;
}

export function defaultExpenseRecord(billingMonth = ""): ExpenseRecord {
  return {
    billingMonth,
    paidToUtility: false,
    meralcoAmount: 0,
    meralcoConsumption: 0,
    miwdResidentialAmount: 0,
    miwdResidentialConsumption: 0,
    miwdCommercialAmount: 0,
    miwdCommercialConsumption: 0,
    aptMotorElecPrev: 0,
    aptMotorElecCurr: 0,
    jjcElecPrev: 0,
    jjcElecCurr: 0,
  };
}

export function expenseRecordStorageKey(month: string): string {
  return `utility-expense:${month}`;
}
