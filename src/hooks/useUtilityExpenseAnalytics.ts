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
  WATER_RATE_STANDARD,
  type UtilityProviderInputs,
} from "@/lib/propertyBillingCalculations";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function calcTrueRate(amount: number, consumption: number): number {
  if (consumption <= 0) return 0;
  return roundCurrency(amount / consumption);
}

function deriveRates(record: ExpenseRecord): UtilityExpenseDerived {
  const meralcoTotalConsumption = roundCurrency(
    record.jjcConsumptionKwh +
      record.apartmentConsumptionKwh +
      record.motorConsumptionKwh,
  );

  const meralcoBillForRate =
    record.meralcoBillAmount > 0
      ? record.meralcoBillAmount
      : meralcoTotalConsumption > 0
        ? roundCurrency(meralcoTotalConsumption * ELECTRICITY_SELLING_RATE)
        : 0;

  const meralcoTrueRate = calcTrueRate(
    meralcoBillForRate,
    meralcoTotalConsumption,
  );

  const motorRate =
    record.electricityMotorRate > 0
      ? record.electricityMotorRate
      : meralcoTrueRate;

  const jjcCalculatedAmount = roundCurrency(
    record.jjcConsumptionKwh * meralcoTrueRate,
  );
  const motorCalculatedAmount = roundCurrency(
    record.motorConsumptionKwh * motorRate,
  );
  const apartmentCalculatedAmount = roundCurrency(
    record.apartmentConsumptionKwh * meralcoTrueRate,
  );

  const computedMeralcoMasterBill = roundCurrency(
    jjcCalculatedAmount + motorCalculatedAmount + apartmentCalculatedAmount,
  );

  const miwdTotalConsumption = roundCurrency(
    record.miwdResidentialM3 +
      record.miwdCommercialM3 +
      record.pumpedWaterChargeM3,
  );

  const miwdBillForRate =
    record.miwdBillAmount > 0
      ? record.miwdBillAmount
      : miwdTotalConsumption > 0
        ? roundCurrency(miwdTotalConsumption * WATER_RATE_STANDARD)
        : 0;

  const miwdTrueRate = calcTrueRate(miwdBillForRate, miwdTotalConsumption);

  const waterMotorRate =
    record.waterMotorRate > 0 ? record.waterMotorRate : miwdTrueRate;

  const miwdResidentialAmount = roundCurrency(
    record.miwdResidentialM3 * miwdTrueRate,
  );
  const miwdCommercialAmount = roundCurrency(
    record.miwdCommercialM3 * miwdTrueRate,
  );
  const pumpedWaterAmount = roundCurrency(
    record.pumpedWaterChargeM3 * waterMotorRate,
  );

  const computedMiwdMasterBill = roundCurrency(
    miwdResidentialAmount + miwdCommercialAmount + pumpedWaterAmount,
  );

  return {
    meralcoTrueRate,
    meralcoTotalConsumption,
    jjcCalculatedAmount,
    motorCalculatedAmount,
    apartmentCalculatedAmount,
    computedMeralcoMasterBill,
    meralcoBalance: roundCurrency(
      computedMeralcoMasterBill - record.meralcoPaidThisMonth,
    ),
    miwdTrueRate,
    miwdTotalConsumption,
    miwdBalance: roundCurrency(
      computedMiwdMasterBill - record.miwdPaidThisMonth,
    ),
    electricitySellingRate: ELECTRICITY_SELLING_RATE,
    miwdResidentialAmount,
    miwdCommercialAmount,
    pumpedWaterAmount,
    computedMiwdMasterBill,
  };
}

function expenseToProviderInputs(
  record: ExpenseRecord,
  derived: UtilityExpenseDerived,
): UtilityProviderInputs {
  const totalBase =
    derived.miwdResidentialAmount + derived.miwdCommercialAmount;
  let residentialConsumption = 0;
  let commercialConsumption = 0;

  if (record.miwdResidentialM3 + record.miwdCommercialM3 > 0) {
    residentialConsumption = record.miwdResidentialM3;
    commercialConsumption = record.miwdCommercialM3;
  } else if (derived.miwdTotalConsumption > 0 && totalBase > 0) {
    residentialConsumption = roundCurrency(
      (derived.miwdTotalConsumption * derived.miwdResidentialAmount) /
        totalBase,
    );
    commercialConsumption = roundCurrency(
      derived.miwdTotalConsumption - residentialConsumption,
    );
  }

  return {
    meralcoBillAmount: derived.computedMeralcoMasterBill,
    meralcoMainConsumption: derived.meralcoTotalConsumption,
    miwdResidentialBill: derived.miwdResidentialAmount,
    miwdResidentialConsumption: residentialConsumption,
    miwdCommercialBill: derived.miwdCommercialAmount,
    miwdCommercialConsumption: commercialConsumption,
    jjcConsumption: record.jjcConsumptionKwh,
    aptMotorConsumption: record.motorConsumptionKwh,
  };
}

function migrateLegacyRecord(
  month: string,
  parsed: Record<string, unknown>,
): ExpenseRecord {
  const base = defaultExpenseRecord(month);

  const jjcConsumptionKwh =
    Number(parsed.jjcConsumptionKwh) ||
    Math.max(
      0,
      Number(parsed.jjcCurrentReading ?? parsed.jjcElecCurr ?? 0) -
        Number(parsed.jjcPreviousReading ?? parsed.jjcElecPrev ?? 0),
    );

  const miwdResidentialM3 =
    Number(
      parsed.miwdResidentialM3 ??
        parsed.miwdResidentialConsumption ??
        parsed.miwdResidential,
    ) || 0;
  const miwdCommercialM3 =
    Number(
      parsed.miwdCommercialM3 ??
        parsed.miwdCommercialConsumption ??
        parsed.miwdCommercial,
    ) || 0;
  const pumpedWaterChargeM3 =
    Number(parsed.pumpedWaterChargeM3 ?? parsed.miwdConsumption) || 0;

  return {
    ...base,
    jjcConsumptionKwh,
    apartmentConsumptionKwh:
      Number(parsed.apartmentConsumptionKwh ?? parsed.meralcoConsumption) || 0,
    motorConsumptionKwh:
      Number(parsed.motorConsumptionKwh ?? parsed.aptMotorConsumption) || 0,
    electricityMotorRate:
      Number(parsed.electricityMotorRate ?? parsed.motorRate) || 0,
    meralcoBillAmount:
      Number(parsed.meralcoBillAmount ?? parsed.meralcoAmount) || 0,
    meralcoPaidThisMonth:
      Number(
        parsed.meralcoPaidThisMonth ??
          parsed.paidToUtilityAmount ??
          parsed.clientPaidAmount,
      ) || 0,
    miwdResidentialM3,
    miwdCommercialM3,
    pumpedWaterChargeM3,
    waterMotorRate: Number(parsed.waterMotorRate) || 0,
    miwdBillAmount:
      Number(
        parsed.miwdBillAmount ??
          (Number(parsed.miwdResidential ?? 0) +
            Number(parsed.miwdCommercial ?? 0)),
      ) || 0,
    miwdPaidThisMonth: Number(parsed.miwdPaidThisMonth) || 0,
    miwdSpecialRate:
      Number(parsed.miwdSpecialRate ?? parsed.specialWaterRate) || 30,
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

function allocatedUtilityPaid(row: SheetRow, bill: number): number {
  const due = Number(row.TotalDue ?? row.Total ?? 0);
  const paid = Number(row.Paid ?? 0);
  if (due <= 0 || bill <= 0) return 0;
  if (row.Status === "Paid") return bill;
  if (row.Status === "Partial") {
    return Math.min(bill, (paid / due) * bill);
  }
  return 0;
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
    const loadedDerived = deriveRates(loaded);
    const normalized = {
      ...loaded,
      meralcoBillAmount: loadedDerived.computedMeralcoMasterBill,
      miwdBillAmount: loadedDerived.computedMiwdMasterBill,
    };
    setRecord(normalized);
    setSavedSnapshot(normalized);
  }, [selectedMonth]);

  const updateRecord = useCallback((patch: Partial<ExpenseRecord>) => {
    setRecord((current) => {
      const next = { ...current, ...patch };
      const nextDerived = deriveRates(next);
      return {
        ...next,
        meralcoBillAmount: nextDerived.computedMeralcoMasterBill,
        miwdBillAmount: nextDerived.computedMiwdMasterBill,
      };
    });
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

    const paidTenantBilled = roundCurrency(
      sheetAnalytics.rooms.reduce(
        (sum, room) =>
          sum +
          allocatedUtilityPaid(
            {
              TotalDue: room.grandTotal,
              Paid: room.amountPaid,
              Status:
                room.amountPaid >= room.grandTotal && room.grandTotal > 0
                  ? "Paid"
                  : room.amountPaid > 0
                    ? "Partial"
                    : "Unpaid",
            } as SheetRow,
            room.elecBill + room.waterBill,
          ),
        0,
      ),
    );

    const tenantElectricityTrueCost = roundCurrency(
      tenantKwh * derived.meralcoTrueRate,
    );
    const netElectricityProfit = roundCurrency(
      paidTenantBilled - tenantElectricityTrueCost,
    );

    const tenantWaterRevenue = roundCurrency(
      tenantM3 * record.miwdSpecialRate,
    );
    const trueTenantWaterCost = roundCurrency(
      tenantM3 * derived.miwdTrueRate,
    );
    const waterMotorCost = roundCurrency(
      record.motorConsumptionKwh > 0
        ? record.motorConsumptionKwh * (record.waterMotorRate || derived.miwdTrueRate)
        : derived.pumpedWaterAmount,
    );
    const netWaterProfit = roundCurrency(
      tenantWaterRevenue - trueTenantWaterCost - waterMotorCost,
    );

    return {
      derived,
      tenantTotalConsumptionKwh: tenantKwh,
      tenantTotalWaterM3: tenantM3,
      paidTenantBilled,
      tenantElectricityTrueCost,
      netElectricityProfit,
      tenantWaterRevenue,
      trueTenantWaterCost,
      netWaterProfit,
      waterMotorCost,
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
