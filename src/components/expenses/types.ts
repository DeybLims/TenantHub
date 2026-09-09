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
  /** Entered Meralco master bill (or allocated sum when bill is 0) */
  computedMeralcoMasterBill: number;
  /** computedMeralcoMasterBill - meralcoPaidThisMonth */
  meralcoBalance: number;
  /** miwdBillAmount / total m³ */
  miwdTrueRate: number;
  /** residential + commercial + pumped m³ */
  miwdTotalConsumption: number;
  /** computedMiwdMasterBill - miwdPaidThisMonth */
  miwdBalance: number;
  electricitySellingRate: number;
  /** residential m³ * true rate */
  miwdResidentialAmount: number;
  /** commercial m³ * true rate */
  miwdCommercialAmount: number;
  /** pumped m³ * waterMotorRate (or true rate) */
  pumpedWaterAmount: number;
  /** Entered MIWD master bill (or allocated sum when bill is 0) */
  computedMiwdMasterBill: number;
}

export interface UtilityExpenseAnalytics {
  derived: UtilityExpenseDerived;
  tenantTotalConsumptionKwh: number;
  tenantTotalWaterM3: number;
  /** Sum of tenant electricity payments collected */
  paidTenantBilled: number;
  /** Apartment share of Meralco master bill (form allocation) */
  tenantElectricityTrueCost: number;
  netElectricityProfit: number;
  /** Sum of tenant water payments collected */
  tenantWaterRevenue: number;
  /** Residential + commercial share of MIWD master bill (form allocation) */
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
