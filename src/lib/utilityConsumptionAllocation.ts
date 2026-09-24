import { roundCurrency } from "@/lib/propertyBillingCalculations";

export type ConsumptionPartKey = "a" | "b" | "c";

export interface ConsumptionParts {
  a: number;
  b: number;
  c: number;
}

export type ConsumptionTouched = Record<ConsumptionPartKey, boolean>;

/**
 * Keep a + b + c = total by assigning remaining to untouched fields.
 * - 1 untouched → gets full remainder
 * - 2+ untouched → split remainder evenly (last gets rounding leftover)
 * - 0 untouched → leave as entered (may not equal total)
 */
export function allocateRemainingConsumption(
  total: number,
  parts: ConsumptionParts,
  touched: ConsumptionTouched,
): ConsumptionParts {
  const safeTotal = Math.max(0, total);
  const keys: ConsumptionPartKey[] = ["a", "b", "c"];
  const untouched = keys.filter((key) => !touched[key]);

  if (safeTotal <= 0 || untouched.length === 0) {
    return {
      a: Math.max(0, parts.a),
      b: Math.max(0, parts.b),
      c: Math.max(0, parts.c),
    };
  }

  const touchedSum = roundCurrency(
    keys
      .filter((key) => touched[key])
      .reduce((sum, key) => sum + Math.max(0, parts[key]), 0),
  );
  const remaining = roundCurrency(Math.max(0, safeTotal - touchedSum));

  const next: ConsumptionParts = {
    a: touched.a ? Math.max(0, parts.a) : 0,
    b: touched.b ? Math.max(0, parts.b) : 0,
    c: touched.c ? Math.max(0, parts.c) : 0,
  };

  if (untouched.length === 1) {
    next[untouched[0]] = remaining;
    return next;
  }

  const base = Math.floor((remaining / untouched.length) * 100) / 100;
  let allocated = 0;
  untouched.forEach((key, index) => {
    if (index === untouched.length - 1) {
      next[key] = roundCurrency(remaining - allocated);
    } else {
      next[key] = base;
      allocated = roundCurrency(allocated + base);
    }
  });

  return next;
}

export function consumptionMismatch(
  total: number,
  parts: ConsumptionParts,
): number {
  const sum = roundCurrency(parts.a + parts.b + parts.c);
  return roundCurrency(sum - Math.max(0, total));
}
