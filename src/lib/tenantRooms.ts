import { billingMonthKey } from "@/lib/months";
import type { TenantRecord } from "@/types/tenant";

export const TOTAL_RENTAL_ROOMS = 8;

export const RENTAL_ROOM_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function createVacantPlaceholder(room: number): TenantRecord {
  return {
    UnitCode: "",
    Room: room,
    Name: "",
    Rent: 0,
    MoveIn: "",
    Deposit: 0,
    Status: "Vacant",
  };
}

export function isVacantTenant(tenant: TenantRecord | undefined): boolean {
  if (!tenant) return true;
  return tenant.Status.trim().toLowerCase() === "vacant";
}

function tenantRecordScore(tenant: TenantRecord): number {
  let score = 0;
  if (!isVacantTenant(tenant)) score += 10;
  if (tenant.Name.trim()) score += 4;
  if (tenant.UnitCode.trim()) score += 2;
  if (tenant.MoveIn.trim()) score += 1;
  return score;
}

/** When the sheet has duplicate rows for one room, keep the best single record. */
export function dedupeTenantsByRoom(tenants: TenantRecord[]): TenantRecord[] {
  const byRoom = new Map<number, TenantRecord[]>();

  for (const tenant of tenants) {
    if (tenant.Room < 1 || tenant.Room > TOTAL_RENTAL_ROOMS) continue;
    const existing = byRoom.get(tenant.Room) ?? [];
    existing.push(tenant);
    byRoom.set(tenant.Room, existing);
  }

  return RENTAL_ROOM_NUMBERS.map((room) => {
    const candidates = byRoom.get(room) ?? [];
    if (candidates.length === 0) {
      return createVacantPlaceholder(room);
    }

    return [...candidates].sort(
      (a, b) => tenantRecordScore(b) - tenantRecordScore(a),
    )[0];
  });
}

/** True when the tenant was occupying the room on or before the selected month. */
export function isTenantActiveInMonth(
  tenant: TenantRecord,
  selectedMonth: string,
): boolean {
  if (isVacantTenant(tenant)) return false;
  if (!selectedMonth) return true;

  const moveInKey = billingMonthKey(tenant.MoveIn);
  const selectedKey = billingMonthKey(selectedMonth);

  if (!moveInKey) return true;
  if (!selectedKey) return true;

  return moveInKey <= selectedKey;
}

/**
 * One row per room (1–8) for the selected month.
 * Tenants with a future move-in date appear as Vacant for earlier months.
 */
export function buildTenantRowsForMonth(
  tenants: TenantRecord[],
  selectedMonth: string,
): TenantRecord[] {
  return dedupeTenantsByRoom(tenants).map((tenant) => {
    if (isTenantActiveInMonth(tenant, selectedMonth)) {
      return tenant;
    }
    return createVacantPlaceholder(tenant.Room);
  });
}

/** Rooms with a vacant sheet row and no active occupant. */
export function getVacantRoomNumbers(tenants: TenantRecord[]): number[] {
  return RENTAL_ROOM_NUMBERS.filter((room) => {
    const roomTenants = tenants.filter((tenant) => tenant.Room === room);
    const hasActiveOccupant = roomTenants.some(
      (tenant) => !isVacantTenant(tenant) && tenant.Name.trim(),
    );
    if (hasActiveOccupant) return false;
    if (roomTenants.length === 0) return true;
    return roomTenants.some((tenant) => isVacantTenant(tenant));
  });
}

export function hasVacantRoom(tenants: TenantRecord[]): boolean {
  return getVacantRoomNumbers(tenants).length > 0;
}

export interface VacantTenantSlot {
  room: number;
  unitCode: string;
}

/** Default unit code when the vacant sheet row has none filled in. */
export function defaultUnitCodeForRoom(room: number): string {
  if (room >= 7) return `COM-20${room - 6}`;
  return `APT-10${room}`;
}

export function getVacantTenantForRoom(
  tenants: TenantRecord[],
  room: number,
): TenantRecord | undefined {
  return tenants.find(
    (tenant) => tenant.Room === room && isVacantTenant(tenant),
  );
}

/** Vacant rooms with the unit code from the existing sheet row (or a default). */
export function getVacantTenantSlots(tenants: TenantRecord[]): VacantTenantSlot[] {
  return getVacantRoomNumbers(tenants).map((room) => {
    const vacantRow = getVacantTenantForRoom(tenants, room);
    const unitCode =
      vacantRow?.UnitCode.trim() || defaultUnitCodeForRoom(room);

    return { room, unitCode };
  });
}
