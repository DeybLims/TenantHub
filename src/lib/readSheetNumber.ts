/** Parses sheet / form numbers, including locale strings like "10,000.00". */
export function readSheetNumber(value: number | string | undefined | null): number {
  if (value === "" || value == null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .trim()
    .replace(/[₱Php\s]/gi, "")
    .replace(/,/g, "");

  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
