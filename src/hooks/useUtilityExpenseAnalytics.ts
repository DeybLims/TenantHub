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
import {
  allocatePaymentToUtilityBills,
  isBillingFullyPaid,
} from "@/lib/paymentAllocation";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function calcTrueRate(amount: number, consumption: number): number {
  if (consumption <= 0 || amount <= 0) return 0;
  return amount / consumption;
}

/**
 * Rate priority: explicit charge rate → master bill ÷ consumption → selling default.
 * Total consumption: explicit total field, else sum of parts.
 */
function deriveRates(record: ExpenseRecord): UtilityExpenseDerived {
  const partsSum = roundCurrency(
    record.jjcConsumptionKwh +
      record.apartmentConsumptionKwh +
      record.motorConsumptionKwh,
  );
  const meralcoTotalConsumption =
    record.meralcoTotalConsumptionKwh > 0
      ? roundCurrency(record.meralcoTotalConsumptionKwh)
      : partsSum;

  const meralcoMasterBill = roundCurrency(Math.max(0, record.meralcoBillAmount));
  const meralcoRate =
    record.electricityChargeRate > 0
      ? record.electricityChargeRate
      : meralcoMasterBill > 0 && meralcoTotalConsumption > 0
        ? calcTrueRate(meralcoMasterBill, meralcoTotalConsumption)
        : ELECTRICITY_SELLING_RATE;

  const motorElecRate =
    record.electricityMotorRate > 0
      ? record.electricityMotorRate
      : meralcoRate;

  const jjcCalculatedAmount = roundCurrency(
    record.jjcConsumptionKwh * meralcoRate,
  );
  const apartmentCalculatedAmount = roundCurrency(
    record.apartmentConsumptionKwh * meralcoRate,
  );
  const motorCalculatedAmount = roundCurrency(
    record.motorConsumptionKwh * motorElecRate,
  );

  const allocatedMeralco = roundCurrency(
    jjcCalculatedAmount + apartmentCalculatedAmount + motorCalculatedAmount,
  );
  const computedMeralcoMasterBill =
    meralcoMasterBill > 0 ? meralcoMasterBill : allocatedMeralco;

  const waterPartsSum = roundCurrency(
    record.miwdResidentialM3 +
      record.miwdCommercialM3 +
      record.pumpedWaterChargeM3,
  );
  const miwdTotalConsumption =
    record.miwdTotalConsumptionM3 > 0
      ? roundCurrency(record.miwdTotalConsumptionM3)
      : waterPartsSum;

  const miwdMasterBill = roundCurrency(Math.max(0, record.miwdBillAmount));
  const miwdRate =
    record.waterChargeRate > 0
      ? record.waterChargeRate
      : miwdMasterBill > 0 && miwdTotalConsumption > 0
        ? calcTrueRate(miwdMasterBill, miwdTotalConsumption)
        : WATER_RATE_STANDARD;

  const waterMotorRate =
    record.waterMotorRate > 0 ? record.waterMotorRate : miwdRate;

  const miwdResidentialAmount = roundCurrency(
    record.miwdResidentialM3 * miwdRate,
  );
  const miwdCommercialAmount = roundCurrency(
    record.miwdCommercialM3 * miwdRate,
  );
  const pumpedWaterAmount = roundCurrency(
    record.pumpedWaterChargeM3 * waterMotorRate,
  );

  const allocatedMiwd = roundCurrency(
    miwdResidentialAmount + miwdCommercialAmount + pumpedWaterAmount,
  );
  const computedMiwdMasterBill =
    miwdMasterBill > 0 ? miwdMasterBill : allocatedMiwd;

  return {
    meralcoTrueRate: roundCurrency(meralcoRate),
    meralcoTotalConsumption,
    jjcCalculatedAmount,
    motorCalculatedAmount,
    apartmentCalculatedAmount,
    computedMeralcoMasterBill,
    meralcoBalance: roundCurrency(
      computedMeralcoMasterBill - record.meralcoPaidThisMonth,
    ),
    miwdTrueRate: roundCurrency(miwdRate),
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

  const apartmentConsumptionKwh =
    Number(parsed.apartmentConsumptionKwh ?? parsed.meralcoConsumption) || 0;
  const motorConsumptionKwh =
    Number(parsed.motorConsumptionKwh ?? parsed.aptMotorConsumption) || 0;
  const partsElecTotal = roundCurrency(
    jjcConsumptionKwh + apartmentConsumptionKwh + motorConsumptionKwh,
  );
  const waterPartsTotal = roundCurrency(
    miwdResidentialM3 + miwdCommercialM3 + pumpedWaterChargeM3,
  );

  return {
    ...base,
    meralcoTotalConsumptionKwh:
      Number(parsed.meralcoTotalConsumptionKwh) || partsElecTotal,
    electricityChargeRate: Number(parsed.electricityChargeRate) || 0,
    jjcConsumptionKwh,
    apartmentConsumptionKwh,
    motorConsumptionKwh,
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
    miwdTotalConsumptionM3:
      Number(parsed.miwdTotalConsumptionM3) || waterPartsTotal,
    waterChargeRate: Number(parsed.waterChargeRate) || 0,
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

function allocatedUtilityPaid(
  row: SheetRow,
  utility: "electricity" | "water",
): number {
  const paid = Number(row.Paid ?? 0);
  const due = Number(row.TotalDue ?? row.Total ?? 0);
  const elecBill = Number(row.ElecBill ?? 0);
  const waterBill = Number(row.WaterBill ?? 0);
  if (paid <= 0 && row.Status !== "Paid") return 0;

  const allocated = allocatePaymentToUtilityBills(paid, elecBill, waterBill, {
    fullyPaid: isBillingFullyPaid(row.Status, paid, due),
  });
  return utility === "electricity" ? allocated.electricity : allocated.water;
}

function roomPaymentStatus(amountPaid: number, grandTotal: number): string {
  if (amountPaid >= grandTotal && grandTotal > 0) return "Paid";
  if (amountPaid > 0) return "Partial";
  return "Unpaid";
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

    const paidTenantBilled = roundCurrency(
      sheetAnalytics.rooms.reduce((sum, room) => {
        const status = roomPaymentStatus(room.amountPaid, room.grandTotal);
        return (
          sum +
          allocatedUtilityPaid(
            {
              TotalDue: room.grandTotal,
              Paid: room.amountPaid,
              Status: status,
              ElecBill: room.elecBill,
              WaterBill: room.waterBill,
            } as SheetRow,
            "electricity",
          )
        );
      }, 0),
    );

    const paidTenantWaterBilled = roundCurrency(
      sheetAnalytics.rooms.reduce((sum, room) => {
        const status = roomPaymentStatus(room.amountPaid, room.grandTotal);
        return (
          sum +
          allocatedUtilityPaid(
            {
              TotalDue: room.grandTotal,
              Paid: room.amountPaid,
              Status: status,
              ElecBill: room.elecBill,
              WaterBill: room.waterBill,
            } as SheetRow,
            "water",
          )
        );
      }, 0),
    );

    // Drive analytics from form consumption. Master bill is optional — when
    // empty, deriveRates already falls back to selling rates so the panel
    // updates as soon as kWh / m³ are entered.
    const hasElecInputs = derived.meralcoTotalConsumption > 0;
    const hasWaterInputs = derived.miwdTotalConsumption > 0;

    const tenantElectricityTrueCost = hasElecInputs
      ? derived.apartmentCalculatedAmount
      : 0;
    const paidElecForAnalytics = hasElecInputs ? paidTenantBilled : 0;
    const netElectricityProfit = hasElecInputs
      ? roundCurrency(paidElecForAnalytics - tenantElectricityTrueCost)
      : 0;

    const trueTenantWaterCost = hasWaterInputs
      ? roundCurrency(
          derived.miwdResidentialAmount + derived.miwdCommercialAmount,
        )
      : 0;
    const waterMotorCost = hasWaterInputs ? derived.pumpedWaterAmount : 0;
    const tenantWaterRevenue = hasWaterInputs ? paidTenantWaterBilled : 0;
    const netWaterProfit = hasWaterInputs
      ? roundCurrency(tenantWaterRevenue - trueTenantWaterCost - waterMotorCost)
      : 0;

    return {
      derived,
      tenantTotalConsumptionKwh: tenantKwh,
      tenantTotalWaterM3: tenantM3,
      paidTenantBilled: paidElecForAnalytics,
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
    const toSave = {
      ...record,
      billingMonth: selectedMonth,
    };
    saveExpenseRecord(selectedMonth, toSave);
    setRecord(toSave);
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
