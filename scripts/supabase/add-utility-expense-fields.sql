-- Adds the Expense page total consumption / charge rate fields to utility_expenses.
-- Safe to re-run.
alter table public.utility_expenses
  add column if not exists meralco_total_consumption_kwh numeric(12, 3) not null default 0,
  add column if not exists electricity_charge_rate numeric(10, 4) not null default 0,
  add column if not exists miwd_total_consumption_m3 numeric(12, 3) not null default 0,
  add column if not exists water_charge_rate numeric(10, 4) not null default 0;

notify pgrst, 'reload schema';
