import { billingMonthKey, sortMonths } from "@/lib/months";
import { readSheetNumber } from "@/lib/readSheetNumber";
import type { SheetRow } from "@/types/sheet";

function readRoom(room: number | string): number {
  const n = Number(room);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Finds the most recent billing entry for a room and returns that bill's current
 * meter readings as the starting previous readings. With `beforeMonth`, only
 * bills from earlier months count (for back-filling a missed month).
 */
export function getPreviousMeterReadings(
  billingRows: SheetRow[],
  room: number,
  beforeMonth?: string,
): { ePrev: number; wPrev: number } {
  const beforeKey = beforeMonth ? billingMonthKey(beforeMonth) : "";
  const roomRows = billingRows.filter((row) => {
    if (readRoom(row.Room) !== room) return false;
    if (!beforeKey) return true;
    const rowKey = billingMonthKey(String(row.Month));
    return Boolean(rowKey) && rowKey < beforeKey;
  });
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
