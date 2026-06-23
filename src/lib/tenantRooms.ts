import type { TenantRecord } from "@/types/tenant";

export const TOTAL_RENTAL_ROOMS = 8;

export const RENTAL_ROOM_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function isVacantTenant(tenant: TenantRecord | undefined): boolean {
  if (!tenant) return true;
  return tenant.Status.trim().toLowerCase() === "vacant";
}

/** Returns room numbers (1–8) that are available for a new tenant. */
export function getVacantRoomNumbers(tenants: TenantRecord[]): number[] {
  const tenantByRoom = new Map(tenants.map((tenant) => [tenant.Room, tenant]));

  return RENTAL_ROOM_NUMBERS.filter((room) =>
    isVacantTenant(tenantByRoom.get(room)),
  );
}

export function getVacantTenants(tenants: TenantRecord[]): TenantRecord[] {
  return tenants
    .filter((tenant) => isVacantTenant(tenant))
    .sort((a, b) => a.Room - b.Room);
}

export function hasVacantRoom(tenants: TenantRecord[]): boolean {
  return getVacantRoomNumbers(tenants).length > 0;
}
