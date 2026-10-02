"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
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
import { billingMonthKey } from "@/lib/months";
import {
  fetchUtilityExpense,
  saveUtilityExpense,
  type UtilityExpenseResponse,
} from "@/services/api";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function calcTrueRate(amount: number, consumption: number): number {
  if (consumption <= 0 || amount <= 0) return 0;
  return amount / consumption;
}

/**
 * Rate priority: explicit charge rate → master bill ÷ consumption → selling default.
 * Total consumption: explicit total field, else sum of parts.
 * Electricity counts JJC + Tenant + Motor; the motor kWh × electricity rate is
 * also shown under water as the pumped water charge.
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

  const motorElecRate = meralcoRate;

  const jjcCalculatedAmount = roundCurrency(
    record.jjcConsumptionKwh * meralcoRate,
  );
  const apartmentCalculatedAmount = roundCurrency(
    record.apartmentConsumptionKwh * meralcoRate,
  );
  const motorCalculatedAmount = roundCurrency(
    record.motorConsumptionKwh * motorElecRate,
  );

  // Master bill is the peso amount from Meralco — never infer it from kWh × rate.
  const computedMeralcoMasterBill = meralcoMasterBill;

  const waterPartsSum = roundCurrency(
    record.miwdResidentialM3 + record.miwdCommercialM3,
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

  const miwdResidentialAmount = roundCurrency(
    record.miwdResidentialM3 * miwdRate,
  );
  const miwdCommercialAmount = roundCurrency(
    record.miwdCommercialM3 * miwdRate,
  );
  const pumpedWaterAmount = motorCalculatedAmount;

  // MIWD master bill is the peso amount from the water bill — not m³ × rate.
  const computedMiwdMasterBill = miwdMasterBill;

  return {
    meralcoTrueRate: roundCurrency(meralcoRate),
    meralcoTotalConsumption,
    jjcCalculatedAmount,
    motorCalculatedAmount,
    apartmentCalculatedAmount,
    computedMeralcoMasterBill,
    meralcoBalance: computedMeralcoMasterBill,
    miwdTrueRate: roundCurrency(miwdRate),
    miwdTotalConsumption,
    miwdBalance: roundCurrency(computedMiwdMasterBill + pumpedWaterAmount),
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
  const waterPartsTotal = roundCurrency(miwdResidentialM3 + miwdCommercialM3);

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

function loadLocalExpenseRecord(month: string): ExpenseRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(expenseRecordStorageKey(month)) ??
      localStorage.getItem(`utility-provider:${month}`);
    if (!raw) return null;
    return migrateLegacyRecord(month, JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

function saveLocalExpenseRecord(month: string, record: ExpenseRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(expenseRecordStorageKey(month), JSON.stringify(record));
}

function clearLocalExpenseRecord(month: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(expenseRecordStorageKey(month));
  localStorage.removeItem(`utility-provider:${month}`);
}

function utilityExpenseQueryKey(month: string) {
  return ["utility-expense", billingMonthKey(month) || month] as const;
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
  /** Unsaved edits to put back after a failed save rolls the cache back. */
  const rollbackDraftRef = useRef<ExpenseRecord | null>(null);

  const queryClient = useQueryClient();
  const toast = useToast();
  const storedQuery = useQuery({
    queryKey: utilityExpenseQueryKey(selectedMonth),
    queryFn: () => fetchUtilityExpense(selectedMonth),
    enabled: Boolean(selectedMonth),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const stored = storedQuery.data;
  const usesSupabase = stored?.configured ?? false;

  useEffect(() => {
    if (!selectedMonth) return;
    if (!stored) {
      const empty = defaultExpenseRecord(selectedMonth);
      setRecord(empty);
      setSavedSnapshot(empty);
      return;
    }

    if (!stored.configured) {
      const local =
        loadLocalExpenseRecord(selectedMonth) ??
        defaultExpenseRecord(selectedMonth);
      setRecord(local);
      setSavedSnapshot(local);
      return;
    }

    const saved = stored.record ?? defaultExpenseRecord(selectedMonth);
    const rollbackDraft =
      rollbackDraftRef.current?.billingMonth === selectedMonth
        ? rollbackDraftRef.current
        : null;
    rollbackDraftRef.current = null;
    // Values typed before expenses moved to Supabase show as unsaved changes
    // so they can be saved to the database or discarded with Cancel.
    const legacyDraft = stored.record
      ? null
      : loadLocalExpenseRecord(selectedMonth);
    setSavedSnapshot(saved);
    setRecord(rollbackDraft ?? legacyDraft ?? saved);
  }, [selectedMonth, stored]);

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

  // The cache is written before the request finishes, so the form shows
  // "saved" instantly; on failure the cache and the user's edits are restored.
  const saveMutation = useMutation<
    void,
    Error,
    ExpenseRecord,
    { previous: UtilityExpenseResponse | undefined }
  >({
    mutationFn: saveUtilityExpense,
    onMutate: async (toSave) => {
      const queryKey = utilityExpenseQueryKey(toSave.billingMonth);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UtilityExpenseResponse>(queryKey);
      queryClient.setQueryData<UtilityExpenseResponse>(queryKey, {
        configured: true,
        record: toSave,
      });
      return { previous };
    },
    onError: (error, toSave, context) => {
      rollbackDraftRef.current = toSave;
      queryClient.setQueryData(
        utilityExpenseQueryKey(toSave.billingMonth),
        context?.previous,
      );
      toast.error(
        "Failed to save expenses",
        `${error.message} Your changes are still on the form.`,
      );
    },
    onSuccess: (_data, toSave) => {
      clearLocalExpenseRecord(toSave.billingMonth);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const isSaving = saveMutation.isPending;

  const save = useCallback(async () => {
    if (!selectedMonth) return;
    const toSave = {
      ...record,
      billingMonth: selectedMonth,
    };

    if (usesSupabase) {
      await saveMutation.mutateAsync(toSave);
      return;
    }

    saveLocalExpenseRecord(selectedMonth, toSave);
    setRecord(toSave);
    setSavedSnapshot(toSave);
  }, [record, selectedMonth, usesSupabase, saveMutation]);

  const cancel = useCallback(() => {
    if (usesSupabase && selectedMonth) clearLocalExpenseRecord(selectedMonth);
    setRecord(savedSnapshot);
  }, [savedSnapshot, usesSupabase, selectedMonth]);

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
    isSaving,
    isLoading: storedQuery.isLoading,
    loadError: storedQuery.error,
  };
}
