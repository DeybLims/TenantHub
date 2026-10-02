"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import {
  BillingActionError,
  billingErrorTitle,
  isCommittedFailure,
} from "@/lib/billingErrors";
import { manilaToday } from "@/lib/manilaTime";
import { billingMonthKey } from "@/lib/months";
import {
  applyCreditToRow,
  applyPaymentToRows,
  billingRowsQueryKey,
  buildOptimisticBillRow,
  findCommittedBill,
  occupancyMonthKey,
  tenantsQueryKey,
  updateTenantInList,
} from "@/lib/optimisticBilling";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
import { billingDateToSheetMonth, sheetMonthToBillingDate } from "@/lib/supabase/mappers";
import { generateBill, payBalance } from "@/services/api";
import type {
  BillingActionResult,
  GenerateBillPayload,
  PayBalancePayload,
  PayBalanceResult,
} from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

interface BillingSnapshot {
  rows: SheetRow[] | undefined;
  tenants: TenantRecord[] | undefined;
}

async function snapshotBillingCaches(
  queryClient: QueryClient,
): Promise<BillingSnapshot> {
  // In-flight refetches would overwrite the optimistic rows when they land.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: billingRowsQueryKey }),
    queryClient.cancelQueries({ queryKey: tenantsQueryKey }),
  ]);
  return {
    rows: queryClient.getQueryData<SheetRow[]>(billingRowsQueryKey),
    tenants: queryClient.getQueryData<TenantRecord[]>(tenantsQueryKey),
  };
}

function restoreBillingCaches(
  queryClient: QueryClient,
  snapshot: BillingSnapshot | undefined,
) {
  if (!snapshot) return;
  if (snapshot.rows) queryClient.setQueryData(billingRowsQueryKey, snapshot.rows);
  if (snapshot.tenants) queryClient.setQueryData(tenantsQueryKey, snapshot.tenants);
}

function refetchBillingCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: billingRowsQueryKey });
  void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

/**
 * Generate Bill with an instant placeholder row (plus any payment and credit
 * it consumes). Rolls the cache back if the server rejects the bill.
 */
export function useGenerateBillMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<BillingActionResult, Error, GenerateBillPayload, BillingSnapshot>({
    mutationFn: generateBill,
    onMutate: async (payload) => {
      const room = Number(payload.room);

      // Reject before anything is sent or painted.
      if (
        findCommittedBill(
          queryClient.getQueryData<SheetRow[]>(billingRowsQueryKey),
          room,
          payload.month,
        )
      ) {
        const monthLabel = billingDateToSheetMonth(
          sheetMonthToBillingDate(payload.month),
        );
        throw new BillingActionError(
          `Room ${room} already has a bill for ${monthLabel}. Edit that bill instead.`,
          { step: "validate" },
        );
      }

      const snapshot = await snapshotBillingCaches(queryClient);
      if (!snapshot.rows) return snapshot;

      const tenant = snapshot.tenants?.find((item) => Number(item.Room) === room);
      const today = manilaToday();

      const withNewBill = [...snapshot.rows, buildOptimisticBillRow(payload)];
      const newBillIndex = withNewBill.length - 1;
      const paid = applyPaymentToRows(withNewBill, {
        room,
        amount: Math.max(0, Number(payload.paid) || 0),
        fromMonthKey: payload.moveInDate
          ? billingMonthKey(payload.moveInDate)
          : occupancyMonthKey(tenant),
        paymentDate: today,
        method: "other",
        reference: "Paid when a new bill was generated",
      });

      let credit = roundCurrency((Number(tenant?.Credit) || 0) + paid.leftover);
      const withCredit = applyCreditToRow(paid.rows[newBillIndex], credit, today);
      paid.rows[newBillIndex] = withCredit.row;
      credit = roundCurrency(credit - withCredit.applied);

      queryClient.setQueryData(billingRowsQueryKey, paid.rows);
      if (snapshot.tenants) {
        queryClient.setQueryData(
          tenantsQueryKey,
          updateTenantInList(snapshot.tenants, room, {
            Credit: credit,
            ...(payload.moveInDate ? { MoveIn: payload.moveInDate } : {}),
          }),
        );
      }

      return snapshot;
    },
    onSuccess: (result) => {
      toast.success("Bill generated", result.message);
    },
    onError: (error, _payload, snapshot) => {
      // A partly saved bill stays in the cache until the refetch replaces it.
      if (!isCommittedFailure(error)) restoreBillingCaches(queryClient, snapshot);
      toast.error(billingErrorTitle(error, "Failed to generate bill"), error.message);
    },
    onSettled: () => {
      refetchBillingCaches(queryClient);
    },
  });
}

/**
 * Pay Balance: the payment lands on the room's bills immediately (oldest
 * first, remainder to credit) and is reverted if the atomic RPC fails.
 */
export function usePayBalanceMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<PayBalanceResult, Error, PayBalancePayload, BillingSnapshot>({
    mutationFn: payBalance,
    onMutate: async (payload) => {
      const snapshot = await snapshotBillingCaches(queryClient);
      if (!snapshot.rows) return snapshot;

      const tenant = snapshot.tenants?.find(
        (item) => Number(item.Room) === payload.room,
      );
      const result = applyPaymentToRows(snapshot.rows, {
        room: payload.room,
        amount: payload.amount,
        fromMonthKey: occupancyMonthKey(tenant),
        paymentDate: payload.paymentDate,
        method: payload.method,
        reference: payload.reference?.trim() ?? "",
      });

      queryClient.setQueryData(billingRowsQueryKey, result.rows);
      if (snapshot.tenants && result.leftover > 0) {
        queryClient.setQueryData(
          tenantsQueryKey,
          updateTenantInList(snapshot.tenants, payload.room, {
            Credit: roundCurrency((Number(tenant?.Credit) || 0) + result.leftover),
          }),
        );
      }

      return snapshot;
    },
    onSuccess: (result) => {
      toast.success("Payment recorded", result.message);
    },
    onError: (error, _payload, snapshot) => {
      if (!isCommittedFailure(error)) restoreBillingCaches(queryClient, snapshot);
      toast.error(billingErrorTitle(error, "Failed to record payment"), error.message);
    },
    onSettled: () => {
      refetchBillingCaches(queryClient);
    },
  });
}
