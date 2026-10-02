import { billingMonthKey } from "@/lib/months";
import { roundCurrency } from "@/lib/propertyBillingCalculations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ExpenseRecord } from "@/components/expenses/types";
import {
  billingDateToSheetMonth,
  billingRowsMatchMonth,
  mapBillingRow,
  mapTenantRow,
  mapUtilityExpenseRow,
  sheetMonthToBillingDate,
  toDbDate,
  todayDbDate,
  utilityExpenseRecordToRow,
  type DbBillingRow,
  type DbTenantRow,
  type DbUtilityExpenseRow,
} from "@/lib/supabase/mappers";
import {
  billMonthLabel,
  describeChainConflict,
  findNextBill,
  restoreNextBillReadings,
  syncNextBillReadings,
  type CurrentReadings,
} from "@/lib/supabase/meterChain";
import type {
  BillingActionResult,
  BillPaymentMethod,
  GenerateBillPayload,
  PayBalancePayload,
  PayBalanceResult,
  UpdateBillPayload,
} from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

type ApiResult = { success: boolean; message: string };

interface TenantSaveData {
  unitCode?: string;
  room?: number | string;
  name?: string;
  contactNumber?: string;
  emailAddress?: string;
  emergencyContact?: string;
  emergencyNumber?: string;
  leaseStart?: string;
  moveIn?: string;
  rent?: number;
  deposit?: number;
  notes?: string;
  status?: string;
  Status?: string;
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function readRoom(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isVacateRequest(data: TenantSaveData): boolean {
  const status = String(data.status ?? data.Status ?? "Active")
    .trim()
    .toLowerCase();
  return status === "vacant";
}

export async function fetchSupabaseTenants(): Promise<TenantRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("room", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as DbTenantRow[]).map(mapTenantRow);
}

export async function fetchSupabaseUtilityExpense(
  month: string,
): Promise<ExpenseRecord | null> {
  if (!billingMonthKey(month)) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("utility_expenses")
    .select("*")
    .eq("billing_month", sheetMonthToBillingDate(month))
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapUtilityExpenseRow(data as DbUtilityExpenseRow, month);
}

export async function saveSupabaseUtilityExpense(
  record: ExpenseRecord,
): Promise<ApiResult> {
  if (!billingMonthKey(record.billingMonth)) {
    return { success: false, message: "Billing month is required." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("utility_expenses")
    .upsert(utilityExpenseRecordToRow(record), { onConflict: "billing_month" });

  if (error) return { success: false, message: error.message };
  return { success: true, message: "Utility expenses saved." };
}

export async function fetchSupabaseBillingRows(
  month?: string,
): Promise<SheetRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("billing_records")
    .select("*")
    .order("billing_month", { ascending: true })
    .order("room", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let rows = (data as DbBillingRow[]).map(mapBillingRow);

  if (month) {
    const targetKey = billingMonthKey(month);
    rows = rows.filter(
      (row) => billingMonthKey(String(row.Month)) === targetKey,
    );
  }

  const billingIds = rows
    .map((row) => row.BillingId)
    .filter((id): id is string => Boolean(id));

  if (billingIds.length > 0) {
    const { data: activities, error: activitiesError } = await supabase
      .from("payment_activities")
      .select("*")
      .in("billing_record_id", billingIds)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (activitiesError) {
      // Table may be missing in older deploys — billing still works without history.
      console.warn("payment_activities fetch:", activitiesError.message);
    } else if (activities?.length) {
      const byBillingId = new Map<
        string,
        NonNullable<SheetRow["PaymentActivities"]>
      >();

      for (const activity of activities as Array<{
        id: string;
        billing_record_id: string;
        payment_date: string;
        amount: number;
        method: string;
        reference_notes: string;
      }>) {
        const list = byBillingId.get(activity.billing_record_id) ?? [];
        list.push({
          id: activity.id,
          paymentDate: activity.payment_date,
          amount: Number(activity.amount) || 0,
          method: activity.method,
          reference: activity.reference_notes ?? "",
        });
        byBillingId.set(activity.billing_record_id, list);
      }

      rows = rows.map((row) => ({
        ...row,
        PaymentActivities: row.BillingId
          ? (byBillingId.get(row.BillingId) ?? [])
          : [],
      }));
    }
  }

  return rows;
}

async function findBillingRecord(
  room: number,
  month: string,
): Promise<DbBillingRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("billing_records")
    .select("*")
    .eq("room", room)
    .order("billing_month", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const matches = (data as DbBillingRow[]).filter((row) =>
    billingRowsMatchMonth(row, month),
  );

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Prefer the row that already has payments / activity when duplicates exist
  // for the same calendar month (e.g. 2026-07-01 vs 2026-07-31).
  return [...matches].sort((a, b) => {
    const paidDiff = Number(b.paid) - Number(a.paid);
    if (paidDiff !== 0) return paidDiff;
    return String(b.billing_month).localeCompare(String(a.billing_month));
  })[0];
}

/**
 * Soft delete: clears the occupant's profile and marks the room Vacant.
 * `billing_records` and `payment_activities` are never touched, so revenue
 * history survives; the next tenant's views start at their move-in month.
 */
export async function vacateSupabaseTenant(
  roomValue: number | string | undefined,
): Promise<ApiResult> {
  const supabase = getSupabaseAdmin();
  const room = readRoom(roomValue);
  if (!room) return { success: false, message: "Room is required." };

  const { data: current, error: fetchError } = await supabase
    .from("tenants")
    .select("*")
    .eq("room", room)
    .maybeSingle<DbTenantRow>();
  if (fetchError) throw new Error(fetchError.message);

  if (!current || current.status !== "Active" || !current.name.trim()) {
    return {
      success: false,
      message: "Active tenant for this room was not found.",
    };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name: "",
      contact_number: "",
      email_address: "",
      emergency_contact: "",
      emergency_number: "",
      lease_start: null,
      move_in: null,
      rent: 0,
      deposit: 0,
      notes: "",
      status: "Vacant",
      credit_balance: 0,
    })
    .eq("room", room);
  if (error) throw new Error(error.message);

  const clearedCredit = roundCurrency(Number(current.credit_balance) || 0);
  return {
    success: true,
    message:
      `${current.name.trim()} moved out. Room ${room} is now vacant; billing and payment history was kept.` +
      (clearedCredit > 0
        ? ` Their unused credit of ${formatPeso(clearedCredit)} was cleared.`
        : ""),
  };
}

/**
 * A new occupant's move-in must come after the room's last chargeable bill,
 * otherwise the previous occupant's bills would appear on their statement.
 */
async function checkMoveInAfterRoomHistory(
  room: number,
  moveIn: string | undefined,
): Promise<ApiResult | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("billing_records")
    .select("billing_month")
    .eq("room", room)
    .neq("status", "Vacant")
    .order("billing_month", { ascending: false })
    .limit(1)
    .maybeSingle<{ billing_month: string }>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const lastKey = billingMonthKey(data.billing_month);
  const [year, month] = lastKey.split("-").map(Number);
  const firstFree = billingDateToSheetMonth(
    `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-01`,
  );
  const lastLabel = billingDateToSheetMonth(data.billing_month);

  if (!moveIn) {
    return {
      success: false,
      message: `Room ${room} has billing history up to ${lastLabel}. Enter a move-in date in ${firstFree} or later.`,
    };
  }
  if (billingMonthKey(moveIn) <= lastKey) {
    return {
      success: false,
      message: `Room ${room} already has a bill for ${lastLabel} from the previous occupant. Set the move-in date to ${firstFree} or later so those bills stay with them.`,
    };
  }
  return null;
}

export async function saveSupabaseTenant(
  data: TenantSaveData,
): Promise<ApiResult> {
  const supabase = getSupabaseAdmin();
  const room = readRoom(data.room);
  if (!room) {
    return { success: false, message: "Room is required." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("tenants")
    .select("*")
    .eq("room", room)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const current = existing as DbTenantRow | null;

  if (isVacateRequest(data)) {
    return vacateSupabaseTenant(room);
  }

  if (!String(data.name ?? "").trim()) {
    return { success: false, message: "Tenant name is required." };
  }

  // Bills are never deleted: a new occupant's history starts at their move-in.
  const wasVacant = !current || current.status === "Vacant" || !current.name.trim();
  if (wasVacant) {
    const moveInConflict = await checkMoveInAfterRoomHistory(
      room,
      data.moveIn || data.leaseStart || undefined,
    );
    if (moveInConflict) return moveInConflict;
  }

  const payload = {
    unit_code: data.unitCode || current?.unit_code || "",
    room,
    name: data.name ?? current?.name ?? "",
    contact_number: data.contactNumber ?? current?.contact_number ?? "",
    email_address: data.emailAddress ?? current?.email_address ?? "",
    emergency_contact: data.emergencyContact ?? current?.emergency_contact ?? "",
    emergency_number: data.emergencyNumber ?? current?.emergency_number ?? "",
    lease_start: data.leaseStart || current?.lease_start || null,
    move_in: data.moveIn || current?.move_in || null,
    rent: Number(data.rent ?? current?.rent ?? 0) || 0,
    deposit: Number(data.deposit ?? current?.deposit ?? 0) || 0,
    notes: data.notes ?? current?.notes ?? "",
    status: "Active" as const,
    ...(wasVacant ? { credit_balance: 0 } : {}),
  };

  const { error } = await supabase.from("tenants").upsert(payload, {
    onConflict: "room",
  });

  if (error) throw new Error(error.message);

  if (wasVacant) {
    return { success: true, message: "Tenant assigned to vacant room." };
  }

  if (current) {
    return { success: true, message: "Tenant profile updated." };
  }

  return { success: true, message: "Tenant committed successfully to database." };
}

/**
 * Bills before the occupant's move-in month are hidden everywhere, so they are
 * only allowed when the caller also moves the move-in back to cover them.
 * Returns the rejection, or an undo for the move-in change (if one was made).
 */
async function ensureBillIsWithinOccupancy(
  room: number,
  billingMonth: string,
  moveInDate: string | undefined,
): Promise<{ blocked: BillingActionResult } | { undo: UndoStep | null }> {
  const supabase = getSupabaseAdmin();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("move_in, lease_start")
    .eq("room", room)
    .maybeSingle<{ move_in: string | null; lease_start: string | null }>();

  if (error) throw new Error(error.message);

  const occupancyKey = billingMonthKey(tenant?.move_in ?? tenant?.lease_start ?? "");
  const billingKey = billingMonthKey(billingMonth);
  if (!occupancyKey || !billingKey || billingKey >= occupancyKey) {
    return { undo: null };
  }

  if (!isIsoDate(moveInDate) || billingMonthKey(moveInDate) > billingKey) {
    return {
      blocked: {
        success: false,
        step: "validate",
        message:
          "This month is before the tenant's move-in date. Move the move-in date back to bill it.",
      },
    };
  }

  const { error: updateError } = await supabase
    .from("tenants")
    .update({ move_in: moveInDate })
    .eq("room", room);
  if (updateError) throw new Error(updateError.message);

  const previousMoveIn = tenant?.move_in ?? null;
  return {
    undo: async () => {
      const { error: undoError } = await supabase
        .from("tenants")
        .update({ move_in: previousMoveIn })
        .eq("room", room);
      return !undoError;
    },
  };
}

/** Reverses one completed step; resolves false if the undo itself failed. */
type UndoStep = () => Promise<boolean>;

/** Runs undo steps newest-first; true only if every one succeeded. */
async function runUndo(steps: UndoStep[]): Promise<boolean> {
  let ok = true;
  for (const step of [...steps].reverse()) {
    ok = (await step().catch(() => false)) && ok;
  }
  return ok;
}

function errorDetails(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return message ? `Details: ${message}` : "";
}

const formatPeso = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

/**
 * Creates a bill in steps: create → sync the next month's previous readings →
 * record payment → apply credit. Up to the payment, a failure undoes the
 * earlier steps; past it, the result reports which step failed.
 */
export async function generateSupabaseBill(
  data: GenerateBillPayload,
): Promise<BillingActionResult> {
  const supabase = getSupabaseAdmin();
  const room = readRoom(data.room);
  const billingMonth = sheetMonthToBillingDate(data.month);

  const { data: existing, error: existingError } = await supabase
    .from("billing_records")
    .select("id")
    .eq("room", room)
    .eq("billing_month", billingMonth)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    return {
      success: false,
      step: "validate",
      message: "A bill already exists for this room and month.",
    };
  }

  const readings: CurrentReadings = {
    elecCurr: Number(data.eCurr) || 0,
    waterCurr: Number(data.wCurr) || 0,
  };
  // Backfilling a past month: the following bill must chain from this one.
  const nextBill = await findNextBill(room, billingMonth);
  const chainConflict = nextBill && describeChainConflict(nextBill, readings);
  if (chainConflict) {
    return { success: false, step: "validate", message: chainConflict };
  }

  const undoSteps: UndoStep[] = [];
  const moveInCheck = await ensureBillIsWithinOccupancy(
    room,
    billingMonth,
    data.moveInDate,
  );
  if ("blocked" in moveInCheck) return moveInCheck.blocked;
  if (moveInCheck.undo) undoSteps.push(moveInCheck.undo);

  const eCons = Number(data.eCurr) - Number(data.ePrev);
  const wCons = Number(data.wCurr) - Number(data.wPrev);
  const eBill = eCons * Number(data.eRate);
  const wBill = wCons * Number(data.wRate);
  const totalDue =
    Number(data.rent) + eBill + wBill + Number(data.adjustment || 0);

  const paidAtCreation = roundCurrency(Math.max(0, Number(data.paid) || 0));

  const { data: inserted, error } = await supabase.from("billing_records").insert({
    billing_month: billingMonth,
    room,
    rent: Number(data.rent) || 0,
    elec_prev: Number(data.ePrev) || 0,
    elec_curr: Number(data.eCurr) || 0,
    elec_rate: Number(data.eRate) || 14,
    elec_bill: eBill,
    water_prev: Number(data.wPrev) || 0,
    water_curr: Number(data.wCurr) || 0,
    water_rate: Number(data.wRate) || 30,
    water_bill: wBill,
    adjustment: Number(data.adjustment) || 0,
    total_due: totalDue,
    paid: 0,
    date_paid: null,
    billing_date: toDbDate(data.billingDate),
    due_date: toDbDate(data.dueDate),
    notes: data.notes?.trim() ?? "",
    status: "Unpaid",
  })
    .select("id")
    .single();

  if (error) {
    await runUndo(undoSteps);
    return {
      success: false,
      step: "create_bill",
      message: `Failed to create the bill. ${errorDetails(error)}`,
    };
  }

  const billingId = (inserted as { id: string }).id;
  undoSteps.push(async () => {
    const { error: deleteError } = await supabase
      .from("billing_records")
      .delete()
      .eq("id", billingId);
    return !deleteError;
  });

  if (nextBill) {
    const label = billMonthLabel(nextBill);
    try {
      const previous = await syncNextBillReadings(nextBill, readings);
      if (previous) {
        undoSteps.push(() => restoreNextBillReadings(nextBill.id, previous));
      }
    } catch (syncError) {
      const undone = await runUndo(undoSteps);
      return undone
        ? {
            success: false,
            step: "sync_meter_readings",
            message: `Failed to update the ${label} bill's previous meter readings, so this bill was not created. ${errorDetails(syncError)}`,
          }
        : {
            success: false,
            step: "sync_meter_readings",
            committed: true,
            message: `Bill created, but the ${label} bill's previous meter readings could not be updated. Edit the ${label} bill to fix them. ${errorDetails(syncError)}`,
          };
    }
  }

  // Payment clears older unpaid bills first, then this bill; the rest is credit.
  let newBillPaid = 0;
  let overpayment = 0;
  if (paidAtCreation > 0) {
    try {
      const payment = await applyTenantPaymentAtomically({
        room,
        amount: paidAtCreation,
        paymentDate: todayDbDate(),
        method: "other",
        reference: "Paid when a new bill was generated",
      });
      newBillPaid =
        payment.allocations.find((item) => item.billing_record_id === billingId)
          ?.new_paid ?? 0;
      overpayment = payment.creditAdded;
    } catch (paymentError) {
      if (!(paymentError instanceof PaymentFunctionMissingError)) {
        // The payment function is all-or-nothing, so nothing was paid.
        const undone = await runUndo(undoSteps);
        return undone
          ? {
              success: false,
              step: "record_payment",
              message: `Failed to record the payment, so the bill was not created. ${errorDetails(paymentError)}`,
            }
          : {
              success: false,
              step: "record_payment",
              committed: true,
              message: `Bill created, but failed to record the ${formatPeso(paidAtCreation)} payment. Use Pay Balance to record it. ${errorDetails(paymentError)}`,
            };
      }
      try {
        const legacy = await allocatePaymentOldestFirst(
          room,
          billingId,
          paidAtCreation,
        );
        newBillPaid = legacy.newBillPaid;
        overpayment = legacy.overpayment;
        if (overpayment > 0) {
          await setTenantCredit(room, (await readTenantCredit(room)) + overpayment);
        }
      } catch (legacyError) {
        return {
          success: false,
          step: "record_payment",
          committed: true,
          message: `Bill created, but the ${formatPeso(paidAtCreation)} payment was only partly recorded. Check this room's bills before recording it again. ${errorDetails(legacyError)}`,
        };
      }
    }
  }

  let creditApplied = 0;
  try {
    creditApplied = await applyTenantCreditToBill(
      room,
      billingId,
      roundCurrency(totalDue),
      newBillPaid,
    );
  } catch (creditError) {
    return {
      success: false,
      step: "apply_credit",
      committed: true,
      message: `Bill created${paidAtCreation > 0 ? " and payment recorded" : ""}, but failed to apply tenant credit. ${errorDetails(creditError)}`,
    };
  }

  const peso = formatPeso;
  const extras = [
    creditApplied > 0 ? `${peso(creditApplied)} credit applied` : "",
    overpayment > 0 ? `${peso(overpayment)} carried over as credit` : "",
  ].filter(Boolean);

  return {
    success: true,
    message: extras.length
      ? `Calculated invoice generated. ${extras.join(", ")}.`
      : "Calculated invoice generated and logged.",
  };
}

const APPLY_PAYMENT_SQL = "scripts/supabase/add-apply-tenant-payment.sql";

class PaymentFunctionMissingError extends Error {
  constructor() {
    super(
      `Payments need a one-time database update. Run ${APPLY_PAYMENT_SQL} in the Supabase SQL Editor, then try again.`,
    );
    this.name = "PaymentFunctionMissingError";
  }
}

interface AtomicPaymentResult {
  allocations: Array<{
    billing_record_id: string;
    billing_month: string;
    amount: number;
    new_paid: number;
  }>;
  creditAdded: number;
}

/**
 * Runs `apply_tenant_payment` — bill updates, payment activities and leftover
 * credit commit together or not at all.
 */
async function applyTenantPaymentAtomically(input: {
  room: number;
  amount: number;
  paymentDate: string;
  method: BillPaymentMethod;
  reference: string;
}): Promise<AtomicPaymentResult> {
  const { data, error } = await getSupabaseAdmin().rpc("apply_tenant_payment", {
    p_room: input.room,
    p_amount: roundCurrency(input.amount),
    p_payment_date: input.paymentDate,
    p_method: input.method,
    p_reference: input.reference,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new PaymentFunctionMissingError();
    }
    throw new Error(error.message);
  }

  const result = (data ?? {}) as {
    allocations?: AtomicPaymentResult["allocations"];
    credit_added?: number | string;
  };
  return {
    allocations: (result.allocations ?? []).map((item) => ({
      ...item,
      amount: Number(item.amount) || 0,
      new_paid: Number(item.new_paid) || 0,
    })),
    creditAdded: roundCurrency(Number(result.credit_added) || 0),
  };
}

export async function paySupabaseBalance(
  data: PayBalancePayload,
): Promise<PayBalanceResult> {
  const room = readRoom(data.room);
  const amount = roundCurrency(Number(data.amount) || 0);
  if (amount <= 0) {
    return { success: false, message: "Enter a valid payment amount." };
  }

  const paymentDate = toDbDate(data.paymentDate);
  if (!paymentDate) {
    return { success: false, message: "Enter a valid payment date." };
  }

  try {
    const result = await applyTenantPaymentAtomically({
      room,
      amount,
      paymentDate,
      method: data.method,
      reference: data.reference?.trim() ?? "",
    });

    const peso = (value: number) =>
      `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
    const billCount = result.allocations.length;
    return {
      success: true,
      message:
        `Payment of ${peso(amount)} applied to ${billCount} bill${billCount === 1 ? "" : "s"}.` +
        (result.creditAdded > 0
          ? ` ${peso(result.creditAdded)} carried over as credit.`
          : ""),
      creditAdded: result.creditAdded,
    };
  } catch (error) {
    return {
      success: false,
      step: "record_payment",
      message:
        error instanceof PaymentFunctionMissingError
          ? error.message
          : `Failed to record the payment. Nothing was saved. ${errorDetails(error)}`,
    };
  }
}

/**
 * Fallback for databases without `apply_tenant_payment`: applies a payment to
 * the room's unpaid bills oldest-first, logging one payment activity per bill.
 * Returns how much landed on `newBillId` and any amount left over.
 */
async function allocatePaymentOldestFirst(
  room: number,
  newBillId: string,
  amount: number,
): Promise<{ newBillPaid: number; overpayment: number }> {
  let remaining = roundCurrency(amount);
  let newBillPaid = 0;
  if (remaining <= 0) return { newBillPaid, overpayment: 0 };

  const supabase = getSupabaseAdmin();
  const fromMonth = await occupancyStartMonth(room);
  let query = supabase
    .from("billing_records")
    .select("id, billing_month, total_due, paid")
    .eq("room", room)
    .neq("status", "Vacant");
  // Earlier bills belong to previous occupants of the room.
  if (fromMonth) query = query.gte("billing_month", fromMonth);
  const { data, error } = await query.order("billing_month", { ascending: true });
  if (error) throw new Error(error.message);

  const today = todayDbDate();
  const bills = (data ?? []) as Array<{
    id: string;
    billing_month: string;
    total_due: number;
    paid: number;
  }>;

  for (const bill of bills) {
    if (remaining <= 0) break;
    const totalDue = Number(bill.total_due) || 0;
    const paid = Number(bill.paid) || 0;
    const owed = roundCurrency(totalDue - paid);
    if (owed <= 0) continue;

    const applied = roundCurrency(Math.min(remaining, owed));
    const newPaid = roundCurrency(paid + applied);

    const { error: updateError } = await supabase
      .from("billing_records")
      .update({
        paid: newPaid,
        status: newPaid >= totalDue ? "Paid" : "Partial",
        date_paid: today,
      })
      .eq("id", bill.id);
    if (updateError) throw new Error(updateError.message);

    const { error: activityError } = await supabase
      .from("payment_activities")
      .insert({
        billing_record_id: bill.id,
        payment_date: today,
        amount: applied,
        method: "other",
        reference_notes: "Paid when a new bill was generated",
      });
    if (activityError) {
      console.warn("payment_activities insert:", activityError.message);
    }

    if (bill.id === newBillId) newBillPaid = newPaid;
    remaining = roundCurrency(remaining - applied);
  }

  return { newBillPaid, overpayment: remaining };
}

/** First day of the current occupant's move-in month (YYYY-MM-01), or null. */
async function occupancyStartMonth(room: number): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("tenants")
    .select("move_in, lease_start")
    .eq("room", room)
    .maybeSingle<{ move_in: string | null; lease_start: string | null }>();
  if (error) throw new Error(error.message);
  const key = billingMonthKey(data?.move_in ?? data?.lease_start ?? "");
  return key ? `${key}-01` : null;
}

async function readTenantCredit(room: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("credit_balance")
    .eq("room", room)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return roundCurrency(Number((data as { credit_balance?: number } | null)?.credit_balance) || 0);
}

async function setTenantCredit(room: number, credit: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tenants")
    .update({ credit_balance: roundCurrency(Math.max(0, credit)) })
    .eq("room", room);

  if (error) throw new Error(error.message);
}

/** Pays the rest of a newly generated bill from the tenant's credit. Returns the amount applied. */
async function applyTenantCreditToBill(
  room: number,
  billingId: string,
  totalDue: number,
  alreadyPaid = 0,
): Promise<number> {
  const remaining = roundCurrency(totalDue - alreadyPaid);
  if (remaining <= 0) return 0;

  const credit = await readTenantCredit(room);
  if (credit <= 0) return 0;

  const applied = roundCurrency(Math.min(credit, remaining));
  const newPaid = roundCurrency(alreadyPaid + applied);
  const today = todayDbDate();
  const supabase = getSupabaseAdmin();

  // Deduct first: if the bill update then fails the credit is put back, so
  // the same credit can never be spent twice.
  await setTenantCredit(room, credit - applied);

  const { error } = await supabase
    .from("billing_records")
    .update({
      paid: newPaid,
      status: newPaid >= totalDue ? "Paid" : "Partial",
      date_paid: today,
    })
    .eq("id", billingId);
  if (error) {
    const restored = await setTenantCredit(room, credit).then(
      () => true,
      () => false,
    );
    throw new Error(
      restored
        ? `${error.message} The tenant's credit balance was not changed.`
        : `${error.message} ₱${applied.toFixed(2)} was deducted from the tenant's credit but not applied; correct credit_balance for room ${room}.`,
    );
  }

  const { error: activityError } = await supabase
    .from("payment_activities")
    .insert({
      billing_record_id: billingId,
      payment_date: today,
      amount: applied,
      method: "other",
      reference_notes: "Credit from previous overpayment",
    });
  if (activityError) {
    console.warn("payment_activities insert:", activityError.message);
  }

  return applied;
}

export async function updateSupabaseBill(
  data: UpdateBillPayload,
): Promise<BillingActionResult> {
  const supabase = getSupabaseAdmin();
  const room = readRoom(data.room);
  const existing = await findBillingRecord(room, data.month);

  if (!existing) {
    return {
      success: false,
      step: "validate",
      message: "Billing record not found for this month and room.",
    };
  }

  const readings: CurrentReadings = {
    elecCurr: Number(data.eCurr) || 0,
    waterCurr: Number(data.wCurr) || 0,
  };
  const readingsChanged =
    Number(existing.elec_curr) !== readings.elecCurr ||
    Number(existing.water_curr) !== readings.waterCurr;
  const nextBill = readingsChanged
    ? await findNextBill(room, existing.billing_month)
    : null;
  const chainConflict = nextBill && describeChainConflict(nextBill, readings);
  if (chainConflict) {
    return { success: false, step: "validate", message: chainConflict };
  }

  const totalDue =
    Number(data.rent) +
    Number(data.eBill) +
    Number(data.wBill) +
    Number(data.adjustment || 0);

  const billingDate =
    toDbDate(data.billingDate) ?? existing.billing_date ?? null;
  const dueDate = toDbDate(data.dueDate) ?? existing.due_date ?? null;
  const datePaid =
    toDbDate(data.datePaid) ?? existing.date_paid ?? null;

  const changes = {
    rent: Number(data.rent) || 0,
    elec_prev: Number(data.ePrev) || 0,
    elec_curr: readings.elecCurr,
    elec_rate: Number(data.eRate) || 0,
    elec_bill: Number(data.eBill) || 0,
    water_prev: Number(data.wPrev) || 0,
    water_curr: readings.waterCurr,
    water_rate: Number(data.wRate) || 0,
    water_bill: Number(data.wBill) || 0,
    adjustment: Number(data.adjustment) || 0,
    total_due: totalDue,
    paid: Number(data.paid) || 0,
    status: (data.status || "Unpaid") as DbBillingRow["status"],
    billing_date: billingDate,
    due_date: dueDate,
    date_paid: datePaid,
    notes: data.notes ?? existing.notes,
  } satisfies Partial<DbBillingRow>;

  const { error } = await supabase
    .from("billing_records")
    .update(changes)
    .eq("id", existing.id);

  if (error) {
    return {
      success: false,
      step: "update_bill",
      message: `Failed to save the bill. ${errorDetails(error)}`,
    };
  }

  if (nextBill) {
    try {
      await syncNextBillReadings(nextBill, readings);
    } catch (syncError) {
      const label = billMonthLabel(nextBill);
      const original = Object.fromEntries(
        Object.keys(changes).map((key) => [key, existing[key as keyof DbBillingRow]]),
      );
      const { error: revertError } = await supabase
        .from("billing_records")
        .update(original)
        .eq("id", existing.id);
      return revertError
        ? {
            success: false,
            step: "sync_meter_readings",
            committed: true,
            message: `Bill saved, but the ${label} bill's previous meter readings could not be updated. Edit the ${label} bill to fix them. ${errorDetails(syncError)}`,
          }
        : {
            success: false,
            step: "sync_meter_readings",
            message: `Failed to update the ${label} bill's previous meter readings, so your changes were not saved. ${errorDetails(syncError)}`,
          };
    }
  }

  const creditToTenant = roundCurrency(Number(data.creditToTenant) || 0);
  if (creditToTenant > 0) {
    try {
      await setTenantCredit(room, (await readTenantCredit(room)) + creditToTenant);
    } catch (creditError) {
      return {
        success: false,
        step: "apply_credit",
        committed: true,
        message: `Bill saved, but failed to add ₱${creditToTenant.toLocaleString("en-PH", { minimumFractionDigits: 2 })} to the tenant's credit. ${errorDetails(creditError)}`,
      };
    }
  }

  if (data.paymentActivity && data.paymentActivity.amount > 0) {
    const method =
      data.paymentActivity.method === "cash" ||
      data.paymentActivity.method === "bank" ||
      data.paymentActivity.method === "online"
        ? data.paymentActivity.method
        : "other";
    const paymentDate =
      toDbDate(data.paymentActivity.paymentDate) ?? datePaid ?? todayDbDate();

    const { error: activityError } = await supabase
      .from("payment_activities")
      .insert({
        billing_record_id: existing.id,
        payment_date: paymentDate,
        amount: Number(data.paymentActivity.amount) || 0,
        method,
        reference_notes: data.paymentActivity.reference?.trim() ?? "",
      });

    if (activityError) {
      console.warn("payment_activities insert:", activityError.message);
      return {
        success: true,
        message:
          "Billing updated, but payment activity could not be logged. Check payment_activities table.",
      };
    }
  }

  return { success: true, message: "Billing record updated." };
}