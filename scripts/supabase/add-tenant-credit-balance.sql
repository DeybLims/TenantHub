-- Overpayment credit per tenant; applied automatically to the next generated bill.
-- Safe to re-run.
alter table public.tenants
  add column if not exists credit_balance numeric(12, 2) not null default 0;

notify pgrst, 'reload schema';
