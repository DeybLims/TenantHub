import { roundCurrency } from "@/lib/propertyBillingCalculations";

/**
 * Apply tenant payments to utility charges before rent/other.
 * Electricity is filled first, then water — so a partial payment that
 * matches utility dues (e.g. ₱49 on a ₱5,000+ rent bill) still shows up
 * under Tenant Collections / Tenant Paid instead of vanishing into rent.
 */
export function allocatePaymentToUtilityBills(
  paid: number,
  elecBill: number,
  waterBill: number,
  options?: { fullyPaid?: boolean },
): { electricity: number; water: number } {
  const safeElec = Math.max(0, elecBill);
  const safeWater = Math.max(0, waterBill);

  if (options?.fullyPaid) {
    return { electricity: safeElec, water: safeWater };
  }

  let remaining = Math.max(0, paid);
  const electricity = roundCurrency(Math.min(remaining, safeElec));
  remaining = roundCurrency(remaining - electricity);
  const water = roundCurrency(Math.min(remaining, safeWater));

  return { electricity, water };
}

export function isBillingFullyPaid(
  status: string | undefined,
  paid: number,
  totalDue: number,
): boolean {
  if (status === "Paid") return true;
  return totalDue > 0 && paid >= totalDue;
}
