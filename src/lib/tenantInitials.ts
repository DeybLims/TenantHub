/** Derives two-letter initials from a tenant name (e.g. "Kharen Denosta" → "KD"). */
export function getTenantInitials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}
