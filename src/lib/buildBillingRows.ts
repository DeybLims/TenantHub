import { billingMonthsMatch } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { BillingTableRow } from "@/types/billing";
import type { SheetRow } from "@/types/sheet";
import type { TenantRecord } from "@/types/tenant";

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

export function buildBillingTableRows(
  billingRows: SheetRow[],
  tenants: TenantRecord[],
  selectedMonth: string,
): BillingTableRow[] {
  if (!selectedMonth) return [];

  const tenantByRoom = new Map(tenants.map((tenant) => [tenant.Room, tenant]));

  const rowByRoom = new Map<number, SheetRow>();
  for (const row of billingRows) {
    if (!billingMonthsMatch(row.Month, selectedMonth)) continue;
    rowByRoom.set(readRoom(row.Room), row);
  }

  return Array.from(rowByRoom.entries())
    .map(([room, row]) => {
      const tenant = tenantByRoom.get(room);
      const rent = readSheetNumber(row.Rent);
      const elecBill = readSheetNumber(row.ElecBill);
      const waterBill = readSheetNumber(row.WaterBill);
      const otherCharges = readSheetNumber(row.Adjustment);
      const totalDue = rent + elecBill + waterBill + otherCharges;
      const paid = readSheetNumber(row.Paid);

      return {
        room,
        unitCode: tenant?.UnitCode || "—",
        tenantName: tenant?.Name || "—",
        rent,
        elecBill,
        elecPrev: readSheetNumber(row.ElecPrev),
        elecCurr: readSheetNumber(row.ElecCurr),
        waterBill,
        waterPrev: readSheetNumber(row.WaterPrev),
        waterCurr: readSheetNumber(row.WaterCurr),
        otherCharges,
        totalDue,
        paid,
        balance: totalDue - paid,
        status: String(row.Status ?? ""),
        month: selectedMonth,
      };
    })
    .sort((a, b) => a.room - b.room);
}

export function findBillingSheetRow(
  billingRows: SheetRow[],
  room: number,
  month: string,
): SheetRow | undefined {
  const matches = billingRows.filter(
    (row) =>
      readRoom(row.Room) === room && billingMonthsMatch(row.Month, month),
  );
  return matches.at(-1);
}

export function hasBillForRoomMonth(
  billingRows: SheetRow[],
  room: number,
  month: string,
): boolean {
  if (!month) return false;
  return billingRows.some(
    (row) =>
      readRoom(row.Room) === room && billingMonthsMatch(row.Month, month),
  );
}
