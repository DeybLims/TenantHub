export function getExpenseCategoryInitials(category: string): string {
  const words = category
    .replace(/^Utility\s*-\s*/i, "")
    .split(/[\s-/]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  if (words.length === 1) {
    const word = words[0];
    return word.length >= 2
      ? word.slice(0, 2).toUpperCase()
      : word.toUpperCase();
  }

  return "EX";
}

export function getCategoryAvatarClass(category: string): string {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("util") || normalized.includes("water")) {
    return "bg-sky-100 text-sky-700";
  }
  if (normalized.includes("maint")) {
    return "bg-amber-100 text-amber-800";
  }
  if (normalized.includes("suppl")) {
    return "bg-violet-100 text-violet-700";
  }
  if (normalized.includes("tax")) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-gray-100 text-gray-700";
}
