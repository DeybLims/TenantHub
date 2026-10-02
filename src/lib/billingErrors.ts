import type { BillingStep } from "@/types/billing";

const STEP_TITLES: Record<BillingStep, string> = {
  validate: "Bill not saved",
  create_bill: "Failed to create bill",
  update_bill: "Failed to save bill",
  sync_meter_readings: "Failed to update meter readings",
  record_payment: "Failed to record payment",
  apply_credit: "Failed to apply tenant credit",
};

export type BillingErrorKind = "rejected" | "network" | "timeout";

/** A failed billing request, with the server step that failed when known. */
export class BillingActionError extends Error {
  readonly step?: BillingStep;
  /** Part of the change is saved on the server — don't roll back the UI. */
  readonly committed: boolean;
  readonly kind: BillingErrorKind;

  constructor(
    message: string,
    options: { step?: BillingStep; committed?: boolean; kind?: BillingErrorKind } = {},
  ) {
    super(message);
    this.name = "BillingActionError";
    this.step = options.step;
    this.committed = options.committed ?? false;
    this.kind = options.kind ?? "rejected";
  }
}

export function isCommittedFailure(error: unknown): boolean {
  return error instanceof BillingActionError && error.committed;
}

/** Short toast title naming what failed, e.g. "Failed to apply tenant credit". */
export function billingErrorTitle(error: unknown, fallback: string): string {
  if (error instanceof BillingActionError) {
    if (error.kind === "network") return "Can't reach the server";
    if (error.kind === "timeout") return "Server not responding";
    if (error.step) return STEP_TITLES[error.step];
  }
  return fallback;
}
