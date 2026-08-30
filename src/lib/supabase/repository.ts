import { billingMonthKey } from "@/lib/months";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  billingRowsMatchMonth,
  mapBillingRow,
  mapTenantRow,
  sheetMonthToBillingDate,
  type DbBillingRow,
  type DbTenantRow,
} from "@/lib/supabase/mappers";
import type { GenerateBillPayload, UpdateBillPayload } from "@/types/billing";
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

function readRoom(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isVacateRequest(data: TenantSaveData): boolean {
  const status = String(data.status ?? data.Status ?? "Active")
    .trim()
    .toLowerCase();
  return status === "vacant" || !String(data.name ?? "").trim();
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

  return matches.at(-1) ?? null;
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
      })
      .eq("room", room);

    if (error) throw new Error(error.message);
    return { success: true, message: "Room set to Vacant." };
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
  };

  const { error } = await supabase.from("tenants").upsert(payload, {
    onConflict: "room",
  });

  if (error) throw new Error(error.message);

  if (current?.status === "Vacant") {
    return { success: true, message: "Tenant assigned to vacant room." };
  }

  if (current) {
    return { success: true, message: "Tenant profile updated." };
  }

  return { success: true, message: "Tenant committed successfully to database." };
}

export async function generateSupabaseBill(
  data: GenerateBillPayload,
): Promise<ApiResult> {
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
      message: "A bill already exists for this room and month.",
    };
  }

  const eCons = Number(data.eCurr) - Number(data.ePrev);
  const wCons = Number(data.wCurr) - Number(data.wPrev);
  const eBill = eCons * Number(data.eRate);
  const wBill = wCons * Number(data.wRate);
  const totalDue =
    Number(data.rent) + eBill + wBill + Number(data.adjustment || 0);

  const { error } = await supabase.from("billing_records").insert({
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
    status: "Unpaid",
  });

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: "Calculated invoice generated and logged.",
  };
}

export async function updateSupabaseBill(
  data: UpdateBillPayload,
): Promise<ApiResult> {
  const supabase = getSupabaseAdmin();
  const room = readRoom(data.room);
  const existing = await findBillingRecord(room, data.month);

  if (!existing) {
    return {
      success: false,
      message: "Billing record not found for this month and room.",
    };
  }

  const totalDue =
    Number(data.rent) +
    Number(data.eBill) +
    Number(data.wBill) +
    Number(data.adjustment || 0);

  const { error } = await supabase
    .from("billing_records")
    .update({
      rent: Number(data.rent) || 0,
      elec_prev: Number(data.ePrev) || 0,
      elec_curr: Number(data.eCurr) || 0,
      elec_rate: Number(data.eRate) || 0,
      elec_bill: Number(data.eBill) || 0,
      water_prev: Number(data.wPrev) || 0,
      water_curr: Number(data.wCurr) || 0,
      water_rate: Number(data.wRate) || 0,
      water_bill: Number(data.wBill) || 0,
      adjustment: Number(data.adjustment) || 0,
      total_due: totalDue,
      paid: Number(data.paid) || 0,
      status: data.status || "Unpaid",
      billing_date: data.billingDate || existing.billing_date,
      due_date: data.dueDate || existing.due_date,
      notes: data.notes ?? existing.notes,
    })
    .eq("id", existing.id);

  if (error) throw new Error(error.message);

  return { success: true, message: "Billing record updated." };
}