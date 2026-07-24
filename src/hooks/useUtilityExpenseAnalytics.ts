"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultExpenseRecord,
  expenseRecordStorageKey,
  type ExpenseRecord,
  type UtilityExpenseAnalytics,
  type UtilityExpenseDerived,
} from "@/components/expenses/types";
import {
  computeMonthlyUtilityAnalytics,
  ELECTRICITY_SELLING_RATE,
  roundCurrency,
  type UtilityProviderInputs,
} from "@/lib/propertyBillingCalculations";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function calcTrueRate(amount: number, consumption: number): number {
  if (consumption <= 0) return 0;
  return roundCurrency(amount / consumption);
}

/**
 * Derived rates from left-side inputs only.
 * - Meralco True Rate = amount / consumption
 * - JJC Consumption = current − previous
 * - JJC Calculated Amount = consumption × Meralco True Rate
 * - MIWD True Rate = (residential + commercial) / total consumption
 */
function deriveRates(record: ExpenseRecord): UtilityExpenseDerived {
  const meralcoTrueRate = calcTrueRate(
    record.meralcoBillAmount,
    record.meralcoConsumption,
  );

  const jjcConsumption = Math.max(
    0,
    roundCurrency(record.jjcCurrentReading - record.jjcPreviousReading),
  );
  const jjcCalculatedAmount = roundCurrency(jjcConsumption * meralcoTrueRate);

  const miwdTrueRate = calcTrueRate(
    record.miwdResidential + record.miwdCommercial,
    record.miwdConsumption,
  );

  return {
    meralcoTrueRate,
    jjcConsumption,
    jjcCalculatedAmount,
    miwdTrueRate,
    electricitySellingRate: ELECTRICITY_SELLING_RATE,
  };
}

function expenseToProviderInputs(
  record: ExpenseRecord,
  derived: UtilityExpenseDerived,
): UtilityProviderInputs {
  // Split total MIWD consumption proportionally by bill amounts for the calc engine.
  const totalBase = record.miwdResidential + record.miwdCommercial;
  let residentialConsumption = 0;
  let commercialConsumption = 0;
  if (record.miwdConsumption > 0 && totalBase > 0) {
    residentialConsumption = roundCurrency(
      (record.miwdConsumption * record.miwdResidential) / totalBase,
    );
    commercialConsumption = roundCurrency(
      record.miwdConsumption - residentialConsumption,
    );
  }

  return {
    meralcoBillAmount: record.meralcoBillAmount,
    meralcoMainConsumption: record.meralcoConsumption,
    miwdResidentialBill: record.miwdResidential,
    miwdResidentialConsumption: residentialConsumption,
    miwdCommercialBill: record.miwdCommercial,
    miwdCommercialConsumption: commercialConsumption,
    jjcConsumption: derived.jjcConsumption,
    aptMotorConsumption: 0,
  };
}

function migrateLegacyRecord(
  month: string,
  parsed: Record<string, unknown>,
): ExpenseRecord {
  const base = defaultExpenseRecord(month);

  const miwdRes =
    Number(
      parsed.miwdResidential ??
        parsed.miwdResidentialAmount ??
        parsed.miwdResidentialBase ??
        parsed.miwdResidentialBill,
    ) || 0;
  const miwdCom =
    Number(
      parsed.miwdCommercial ??
        parsed.miwdCommercialAmount ??
        parsed.miwdCommercialBase ??
        parsed.miwdCommercialBill,
    ) || 0;

  const resCons = Number(parsed.miwdResidentialConsumption) || 0;
  const comCons = Number(parsed.miwdCommercialConsumption) || 0;
  const totalCons =
    Number(parsed.miwdConsumption ?? parsed.miwdTotalConsumption) ||
    (resCons + comCons > 0 ? resCons + comCons : 0);

  const jjcPreviousReading =
    Number(
      parsed.jjcPreviousReading ?? parsed.jjcElecPrev ?? parsed.jjcPrev,
    ) || 0;
  const jjcCurrentReading =
    Number(
      parsed.jjcCurrentReading ?? parsed.jjcElecCurr ?? parsed.jjcCurr,
    ) || 0;

  return {
    ...base,
    paidToUtility: Boolean(parsed.paidToUtility),
    jjcPreviousReading,
    jjcCurrentReading,
    meralcoBillAmount:
      Number(parsed.meralcoBillAmount ?? parsed.meralcoAmount) || 0,
    meralcoConsumption:
      Number(parsed.meralcoConsumption ?? parsed.meralcoMainConsumption) || 0,
    miwdResidential: miwdRes,
    miwdCommercial: miwdCom,
    miwdConsumption: totalCons,
    miwdSpecialRate: Number(parsed.miwdSpecialRate ?? parsed.specialWaterRate) || 30,
  };
}

function loadExpenseRecord(month: string): ExpenseRecord {
  if (typeof window === "undefined") return defaultExpenseRecord(month);
  try {
    const raw =
      localStorage.getItem(expenseRecordStorageKey(month)) ??
      localStorage.getItem(`utility-provider:${month}`);
    if (!raw) return defaultExpenseRecord(month);
    return migrateLegacyRecord(month, JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return defaultExpenseRecord(month);
  }
}

function saveExpenseRecord(month: string, record: ExpenseRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(expenseRecordStorageKey(month), JSON.stringify(record));
}

interface UseUtilityExpenseAnalyticsOptions {
  selectedMonth: string;
  billingRows: SheetRow[];
  tenants: TenantRecord[];
}

export function useUtilityExpenseAnalytics({
  selectedMonth,
  billingRows,
  tenants,
}: UseUtilityExpenseAnalyticsOptions) {
  const [record, setRecord] = useState<ExpenseRecord>(() =>
    defaultExpenseRecord(selectedMonth),
  );
  const [savedSnapshot, setSavedSnapshot] = useState<ExpenseRecord>(() =>
    defaultExpenseRecord(selectedMonth),
  );

  useEffect(() => {
    if (!selectedMonth) return;
    const loaded = loadExpenseRecord(selectedMonth);
    setRecord(loaded);
    setSavedSnapshot(loaded);
  }, [selectedMonth]);

  const updateRecord = useCallback((patch: Partial<ExpenseRecord>) => {
    setRecord((current) => ({ ...current, ...patch }));
  }, []);

  const derived = useMemo(() => deriveRates(record), [record]);

  const sheetAnalytics = useMemo(() => {
    if (!selectedMonth) return null;
    return computeMonthlyUtilityAnalytics(
      billingRows,
      tenants,
      selectedMonth,
      expenseToProviderInputs(record, derived),
    );
  }, [billingRows, tenants, selectedMonth, record, derived]);

  const analytics = useMemo<UtilityExpenseAnalytics | null>(() => {
    if (!sheetAnalytics) return null;

    const tenantKwh = sheetAnalytics.sumElecConsumption;
    const tenantM3 = sheetAnalytics.sumWaterConsumption;

    // Electricity: billed = kWh × selling rate; cost = kWh × true rate
    const tenantTotalBilled = roundCurrency(
      tenantKwh * derived.electricitySellingRate,
    );
    const tenantElectricityTrueCost = roundCurrency(
      tenantKwh * derived.meralcoTrueRate,
    );
    const netElectricityProfit = roundCurrency(
      tenantTotalBilled - tenantElectricityTrueCost,
    );

    // Water: revenue = m³ × special rate; cost = m³ × MIWD true rate
    // (APT Motor overhead omitted — no input in locked UI layout)
    const tenantWaterRevenue = roundCurrency(
      tenantM3 * record.miwdSpecialRate,
    );
    const trueTenantWaterCost = roundCurrency(
      tenantM3 * derived.miwdTrueRate,
    );
    const netWaterProfit = roundCurrency(
      tenantWaterRevenue - trueTenantWaterCost,
    );

    return {
      derived,
      tenantTotalConsumptionKwh: tenantKwh,
      tenantTotalWaterM3: tenantM3,
      tenantTotalBilled,
      tenantElectricityTrueCost,
      netElectricityProfit,
      tenantWaterRevenue,
      trueTenantWaterCost,
      netWaterProfit,
      miwdResidentialAmount: record.miwdResidential,
      miwdCommercialAmount: record.miwdCommercial,
      warnings: sheetAnalytics.warnings.map((warning) => ({
        room: warning.room,
        utility: warning.utility,
        delta: warning.delta,
      })),
    };
  }, [sheetAnalytics, record, derived]);

  const save = useCallback(() => {
    if (!selectedMonth) return;
    const toSave = { ...record, billingMonth: selectedMonth };
    saveExpenseRecord(selectedMonth, toSave);
    setSavedSnapshot(toSave);
  }, [record, selectedMonth]);

  const cancel = useCallback(() => {
    setRecord(savedSnapshot);
  }, [savedSnapshot]);

  const isDirty = useMemo(
    () => JSON.stringify(record) !== JSON.stringify(savedSnapshot),
    [record, savedSnapshot],
  );

  return {
    record,
    analytics,
    derived,
    updateRecord,
    save,
    cancel,
    isDirty,
  };
}
