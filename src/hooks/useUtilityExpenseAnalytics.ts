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
  calcConsumption,
  computeMonthlyUtilityAnalytics,
  ELECTRICITY_SELLING_RATE,
  roundCurrency,
  WATER_RATE_SPECIAL_JANUARY,
  WATER_RATE_STANDARD,
  type UtilityProviderInputs,
} from "@/lib/propertyBillingCalculations";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

const WATER_STANDARD_RATE = WATER_RATE_STANDARD;
const WATER_SPECIAL_RATE = WATER_RATE_SPECIAL_JANUARY;

function calcTrueRate(amount: number, consumption: number): number {
  if (consumption <= 0) return 0;
  return roundCurrency(amount / consumption);
}

function deriveRates(record: ExpenseRecord): UtilityExpenseDerived {
  const meralcoTrueRate = calcTrueRate(
    record.meralcoAmount,
    record.meralcoConsumption,
  );

  const miwdResidentialTrueRate = calcTrueRate(
    record.miwdResidentialAmount,
    record.miwdResidentialConsumption,
  );
  const miwdCommercialTrueRate = calcTrueRate(
    record.miwdCommercialAmount,
    record.miwdCommercialConsumption,
  );

  const averageWaterAmount = roundCurrency(
    record.miwdResidentialAmount + record.miwdCommercialAmount,
  );
  const averageWaterConsumption = roundCurrency(
    record.miwdResidentialConsumption + record.miwdCommercialConsumption,
  );
  const averageWaterTrueRate = calcTrueRate(
    averageWaterAmount,
    averageWaterConsumption,
  );

  const aptMotorConsumptionKwh = calcConsumption(
    record.aptMotorElecPrev,
    record.aptMotorElecCurr,
  );
  const jjcConsumptionKwh = calcConsumption(
    record.jjcElecPrev,
    record.jjcElecCurr,
  );

  const aptMotorTrueCost = roundCurrency(
    aptMotorConsumptionKwh * meralcoTrueRate,
  );
  const jjcTrueCost = roundCurrency(jjcConsumptionKwh * meralcoTrueRate);

  return {
    meralcoTrueRate,
    miwdResidentialTrueRate,
    miwdCommercialTrueRate,
    averageWaterAmount,
    averageWaterConsumption,
    averageWaterTrueRate,
    aptMotorConsumptionKwh,
    aptMotorTrueCost,
    jjcConsumptionKwh,
    jjcTrueCost,
    electricitySellingRate: ELECTRICITY_SELLING_RATE,
    waterStandardSellingRate: WATER_STANDARD_RATE,
    specialWaterRate: WATER_SPECIAL_RATE,
  };
}

function expenseToProviderInputs(
  record: ExpenseRecord,
  derived: UtilityExpenseDerived,
): UtilityProviderInputs {
  return {
    meralcoBillAmount: record.meralcoAmount,
    meralcoMainConsumption: record.meralcoConsumption,
    miwdResidentialBill: record.miwdResidentialAmount,
    miwdResidentialConsumption: record.miwdResidentialConsumption,
    miwdCommercialBill: record.miwdCommercialAmount,
    miwdCommercialConsumption: record.miwdCommercialConsumption,
    jjcConsumption: derived.jjcConsumptionKwh,
    aptMotorConsumption: derived.aptMotorConsumptionKwh,
  };
}

function migrateLegacyRecord(
  month: string,
  parsed: Record<string, unknown>,
): ExpenseRecord {
  const base = defaultExpenseRecord(month);

  return {
    ...base,
    paidToUtility: Boolean(parsed.paidToUtility),
    meralcoAmount:
      Number(parsed.meralcoAmount ?? parsed.meralcoBillAmount) || 0,
    meralcoConsumption:
      Number(parsed.meralcoConsumption ?? parsed.meralcoMainConsumption) || 0,
    miwdResidentialAmount:
      Number(
        parsed.miwdResidentialAmount ??
          parsed.miwdResidentialBase ??
          parsed.miwdResidentialBill,
      ) || 0,
    miwdResidentialConsumption:
      Number(parsed.miwdResidentialConsumption) ||
      Number(parsed.miwdTotalConsumption) ||
      0,
    miwdCommercialAmount:
      Number(
        parsed.miwdCommercialAmount ??
          parsed.miwdCommercialBase ??
          parsed.miwdCommercialBill,
      ) || 0,
    miwdCommercialConsumption:
      Number(parsed.miwdCommercialConsumption) || 0,
    aptMotorElecPrev: Number(parsed.aptMotorElecPrev) || 0,
    aptMotorElecCurr: Number(parsed.aptMotorElecCurr) || 0,
    jjcElecPrev: Number(parsed.jjcElecPrev) || 0,
    jjcElecCurr: Number(parsed.jjcElecCurr) || 0,
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

    const tenantWaterRevenue = sheetAnalytics.sumWaterBills;

    const trueTenantWaterCost = roundCurrency(
      sheetAnalytics.sumWaterConsumption * derived.miwdResidentialTrueRate +
        derived.aptMotorTrueCost,
    );

    return {
      derived,
      tenantTotalConsumptionKwh: sheetAnalytics.sumElecConsumption,
      tenantTotalBilled: sheetAnalytics.sumElecBills,
      tenantElectricityTrueCost: sheetAnalytics.tenantElectricityTrueCost,
      netElectricityProfit: sheetAnalytics.ebillNet,
      tenantWaterRevenue,
      trueTenantWaterCost,
      netWaterProfit: roundCurrency(tenantWaterRevenue - trueTenantWaterCost),
      miwdResidentialAmount: record.miwdResidentialAmount,
      miwdCommercialAmount: record.miwdCommercialAmount,
      totalDueNet: sheetAnalytics.totalDueNet,
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
