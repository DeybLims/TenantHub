export type UtilityPaymentStatus = "Paid" | "Unpaid";

/**
 * User-editable expense inputs for one billing month.
 * True rates and analytics are always derived — never stored.
 */
export interface ExpenseRecord {
  billingMonth: string;
  paidToUtility: boolean;
  /** JJC meter previous reading (kWh) */
  jjcPreviousReading: number;
  /** JJC meter current reading (kWh) */
  jjcCurrentReading: number;
  /** Meralco Master Bill Amount (₱) */
  meralcoBillAmount: number;
  /** Meralco Total Consumption (kWh) */
  meralcoConsumption: number;
  /** MIWD Residential Base (₱) */
  miwdResidential: number;
  /** MIWD Commercial Base (₱) */
  miwdCommercial: number;
  /** MIWD Total Consumption (m³) */
  miwdConsumption: number;
  /** Special Water Rate (₱/m³) charged to tenants */
  miwdSpecialRate: number;
}

/** Auto-calculated values from ExpenseRecord inputs. */
export interface UtilityExpenseDerived {
  /** meralcoBillAmount / meralcoConsumption */
  meralcoTrueRate: number;
  /** jjcCurrentReading - jjcPreviousReading */
  jjcConsumption: number;
  /** jjcConsumption * meralcoTrueRate */
  jjcCalculatedAmount: number;
  /** (miwdResidential + miwdCommercial) / miwdConsumption */
  miwdTrueRate: number;
  electricitySellingRate: number;
}

export interface UtilityExpenseAnalytics {
  derived: UtilityExpenseDerived;
  tenantTotalConsumptionKwh: number;
  tenantTotalWaterM3: number;
  /** tenant kWh × selling rate */
  tenantTotalBilled: number;
  /** tenant kWh × meralco true rate */
  tenantElectricityTrueCost: number;
  netElectricityProfit: number;
  /** tenant m³ × miwdSpecialRate */
  tenantWaterRevenue: number;
  /** tenant m³ × miwd true rate */
  trueTenantWaterCost: number;
  netWaterProfit: number;
  miwdResidentialAmount: number;
  miwdCommercialAmount: number;
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
    jjcPreviousReading: 0,
    jjcCurrentReading: 0,
    meralcoBillAmount: 0,
    meralcoConsumption: 0,
    miwdResidential: 0,
    miwdCommercial: 0,
    miwdConsumption: 0,
    miwdSpecialRate: 30,
  };
}

export function expenseRecordStorageKey(month: string): string {
  return `utility-expense:${month}`;
}
