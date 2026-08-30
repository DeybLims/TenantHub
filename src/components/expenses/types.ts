/**
 * User-editable expense inputs for one billing month.
 * True rates and analytics are always derived — never stored.
 */
export interface ExpenseRecord {
  billingMonth: string;
  /** Electricity consumption (kWh) */
  jjcConsumptionKwh: number;
  apartmentConsumptionKwh: number;
  motorConsumptionKwh: number;
  /** Motor rate below JJC (electricity, ₱/kWh) */
  electricityMotorRate: number;
  /** Meralco Master Bill Amount (₱) */
  meralcoBillAmount: number;
  /** Client paid to Meralco this month (₱) */
  meralcoPaidThisMonth: number;
  /** Water consumption (m³) */
  miwdResidentialM3: number;
  miwdCommercialM3: number;
  pumpedWaterChargeM3: number;
  /** Motor rate below JJC (water, ₱/m³) */
  waterMotorRate: number;
  /** MIWD Master Bill Amount (₱) */
  miwdBillAmount: number;
  /** Client paid to MIWD this month (₱) */
  miwdPaidThisMonth: number;
  /** Special Water Rate (₱/m³) charged to tenants */
  miwdSpecialRate: number;
}

/** Auto-calculated values from ExpenseRecord inputs. */
export interface UtilityExpenseDerived {
  /** meralcoBillAmount / total kWh */
  meralcoTrueRate: number;
  /** jjc + apartment + motor kWh */
  meralcoTotalConsumption: number;
  /** jjcConsumptionKwh * meralcoTrueRate */
  jjcCalculatedAmount: number;
  /** motorConsumptionKwh * electricityMotorRate (or true rate if motor rate unset) */
  motorCalculatedAmount: number;
  /** apartmentConsumptionKwh * meralcoTrueRate */
  apartmentCalculatedAmount: number;
  /** jjc + motor + apartment (auto master bill) */
  computedMeralcoMasterBill: number;
  /** meralcoBillAmount - meralcoPaidThisMonth */
  meralcoBalance: number;
  /** miwdBillAmount / total m³ */
  miwdTrueRate: number;
  /** residential + commercial + pumped m³ */
  miwdTotalConsumption: number;
  /** miwdBillAmount - miwdPaidThisMonth */
  miwdBalance: number;
  electricitySellingRate: number;
  /** residential m³ * true rate */
  miwdResidentialAmount: number;
  /** commercial m³ * true rate */
  miwdCommercialAmount: number;
  /** pumped m³ * waterMotorRate (or true rate) */
  pumpedWaterAmount: number;
  /** residential + commercial + pumped (auto master bill) */
  computedMiwdMasterBill: number;
}

export interface UtilityExpenseAnalytics {
  derived: UtilityExpenseDerived;
  tenantTotalConsumptionKwh: number;
  tenantTotalWaterM3: number;
  /** Sum of tenant utility payments collected */
  paidTenantBilled: number;
  /** tenant kWh × meralco true rate */
  tenantElectricityTrueCost: number;
  netElectricityProfit: number;
  /** tenant m³ × miwdSpecialRate */
  tenantWaterRevenue: number;
  /** tenant m³ × miwd true rate */
  trueTenantWaterCost: number;
  netWaterProfit: number;
  /** motor overhead cost for water */
  waterMotorCost: number;
  warnings: Array<{
    room: number;
    utility: string;
    delta: number;
  }>;
}

export function defaultExpenseRecord(billingMonth = ""): ExpenseRecord {
  return {
    billingMonth,
    jjcConsumptionKwh: 0,
    apartmentConsumptionKwh: 0,
    motorConsumptionKwh: 0,
    electricityMotorRate: 0,
    meralcoBillAmount: 0,
    meralcoPaidThisMonth: 0,
    miwdResidentialM3: 0,
    miwdCommercialM3: 0,
    pumpedWaterChargeM3: 0,
    waterMotorRate: 0,
    miwdBillAmount: 0,
    miwdPaidThisMonth: 0,
    miwdSpecialRate: 30,
  };
}

export function expenseRecordStorageKey(month: string): string {
  return `utility-expense:${month}`;
}
