export function formatPeso(value: number): string {
  return `₱ ${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}
