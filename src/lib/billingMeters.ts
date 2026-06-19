import { sortMonths } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { SheetRow } from "@/types/sheet";

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Finds the most recent billing entry for a room across all months and returns
 * that bill's current meter readings as the starting previous readings.
 */
export function getPreviousMeterReadings(
  billingRows: SheetRow[],
  room: number,
): { ePrev: number; wPrev: number } {
  const roomRows = billingRows.filter((row) => readRoom(row.Room) === room);
  if (roomRows.length === 0) {
    return { ePrev: 0, wPrev: 0 };
  }

  const rowsByMonth = new Map<string, SheetRow[]>();
  for (const row of roomRows) {
    const existing = rowsByMonth.get(row.Month) ?? [];
    existing.push(row);
    rowsByMonth.set(row.Month, existing);
  }

  const latestMonth = sortMonths([...rowsByMonth.keys()]).at(-1);
  if (!latestMonth) {
    return { ePrev: 0, wPrev: 0 };
  }

  const latestRow = rowsByMonth.get(latestMonth)?.at(-1);
  if (!latestRow) {
    return { ePrev: 0, wPrev: 0 };
  }

  return {
    ePrev: readSheetNumber(latestRow.ElecCurr),
    wPrev: readSheetNumber(latestRow.WaterCurr),
  };
}

export function isCurrentReadingBelowPrevious(
  current: string,
  previous: string,
): boolean {
  if (current.trim() === "") return false;
  return readSheetNumber(current) < readSheetNumber(previous);
}
