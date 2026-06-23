const badgeBase =
  "inline-flex rounded-full px-3 py-1 text-xs font-medium";

export function getCategoryBadgeClass(category: string): string {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("util") || normalized.includes("water")) {
    return `${badgeBase} bg-sky-100 text-sky-800`;
  }
  if (normalized.includes("maint")) {
    return `${badgeBase} bg-amber-100 text-amber-800`;
  }
  if (normalized.includes("suppl")) {
    return `${badgeBase} bg-violet-100 text-violet-800`;
  }
  if (normalized.includes("tax")) {
    return `${badgeBase} bg-rose-100 text-rose-800`;
  }

  return `${badgeBase} bg-gray-100 text-gray-700`;
}
