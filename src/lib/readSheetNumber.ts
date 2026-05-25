export function readSheetNumber(value: number | string | undefined | null): number {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
