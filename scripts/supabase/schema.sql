-- TenantHub — Supabase schema (PostgreSQL)
-- Safe to run in: Supabase Dashboard → SQL Editor
--
-- • Idempotent (IF NOT EXISTS / ON CONFLICT) — no DROP TABLE
-- • Row Level Security enabled on every table
-- • Use SUPABASE_SERVICE_ROLE_KEY in Next.js API routes (bypasses RLS)
-- • Or sign in users and use the "authenticated" policies below

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type tenant_status as enum ('Active', 'Vacant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type bill_status as enum ('Paid', 'Unpaid', 'Partial', 'Vacant');
exception when duplicate_object then null;
end $$;

-- Add Vacant if schema was created before this value existed
do $$ begin
  alter type bill_status add value if not exists 'Vacant';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('cash', 'bank', 'online', 'other');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Tenants
-- ---------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null,
  room smallint not null check (room between 1 and 99),
  name text not null default '',
  contact_number text not null default '',
  email_address text not null default '',
  emergency_contact text not null default '',
  emergency_number text not null default '',
  lease_start date,
  move_in date,
  rent numeric(12, 2) not null default 0,
  deposit numeric(12, 2) not null default 0,
  notes text not null default '',
  status tenant_status not null default 'Vacant',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenants_room_unique unique (room)
);

create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists tenants_unit_code_idx on public.tenants (unit_code);

do $trigger$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tenants_set_updated_at'
  ) then
    create trigger tenants_set_updated_at
      before update on public.tenants
      for each row execute function public.set_updated_at();
  end if;
end;
$trigger$;

alter table public.tenants enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Billing records
-- ---------------------------------------------------------------------------
create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  billing_month date not null,
  room smallint not null references public.tenants (room) on update cascade,
  rent numeric(12, 2) not null default 0,
  elec_prev numeric(12, 3) not null default 0,
  elec_curr numeric(12, 3) not null default 0,
  elec_rate numeric(10, 4) not null default 14,
  elec_bill numeric(12, 2) not null default 0,
  water_prev numeric(12, 3) not null default 0,
  water_curr numeric(12, 3) not null default 0,
  water_rate numeric(10, 4) not null default 30,
  water_bill numeric(12, 2) not null default 0,
  adjustment numeric(12, 2) not null default 0,
  total_due numeric(12, 2) not null default 0,
  paid numeric(12, 2) not null default 0,
  date_paid date,
  billing_date date,
  due_date date,
  notes text not null default '',
  status bill_status not null default 'Unpaid',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_records_month_room_unique unique (billing_month, room)
);

create index if not exists billing_records_month_idx
  on public.billing_records (billing_month desc);
create index if not exists billing_records_room_idx
  on public.billing_records (room);
create index if not exists billing_records_status_idx
  on public.billing_records (status);

do $trigger$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'billing_records_set_updated_at'
  ) then
    create trigger billing_records_set_updated_at
      before update on public.billing_records
      for each row execute function public.set_updated_at();
  end if;
end;
$trigger$;

alter table public.billing_records enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Payment activity
-- ---------------------------------------------------------------------------
create table if not exists public.payment_activities (
  id uuid primary key default gen_random_uuid(),
  billing_record_id uuid not null
    references public.billing_records (id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  method payment_method not null default 'bank',
  reference_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_activities_billing_idx
  on public.payment_activities (billing_record_id, payment_date desc);

alter table public.payment_activities enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Utility expenses (Meralco / MIWD)
-- ---------------------------------------------------------------------------
create table if not exists public.utility_expenses (
  id uuid primary key default gen_random_uuid(),
  billing_month date not null,
  jjc_consumption_kwh numeric(12, 3) not null default 0,
  apartment_consumption_kwh numeric(12, 3) not null default 0,
  motor_consumption_kwh numeric(12, 3) not null default 0,
  electricity_motor_rate numeric(10, 4) not null default 0,
  meralco_bill_amount numeric(12, 2) not null default 0,
  meralco_paid_this_month numeric(12, 2) not null default 0,
  miwd_residential_m3 numeric(12, 3) not null default 0,
  miwd_commercial_m3 numeric(12, 3) not null default 0,
  pumped_water_charge_m3 numeric(12, 3) not null default 0,
  water_motor_rate numeric(10, 4) not null default 0,
  miwd_bill_amount numeric(12, 2) not null default 0,
  miwd_paid_this_month numeric(12, 2) not null default 0,
  miwd_special_rate numeric(10, 4) not null default 30,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint utility_expenses_month_unique unique (billing_month)
);

do $trigger$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'utility_expenses_set_updated_at'
  ) then
    create trigger utility_expenses_set_updated_at
      before update on public.utility_expenses
      for each row execute function public.set_updated_at();
  end if;
end;
$trigger$;

alter table public.utility_expenses enable row level security;

-- ---------------------------------------------------------------------------
-- 5. General expenses (optional misc ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.general_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text not null default '',
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists general_expenses_date_idx
  on public.general_expenses (expense_date desc);

do $trigger$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'general_expenses_set_updated_at'
  ) then
    create trigger general_expenses_set_updated_at
      before update on public.general_expenses
      for each row execute function public.set_updated_at();
  end if;
end;
$trigger$;

alter table public.general_expenses enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies — logged-in Supabase users (when you add Auth)
-- anon key gets NO access unless you add separate policies.
-- service_role (server API routes) bypasses RLS automatically.
-- ---------------------------------------------------------------------------
do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tenants'
      and policyname = 'tenants_authenticated_all'
  ) then
    create policy tenants_authenticated_all on public.tenants
      for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'billing_records'
      and policyname = 'billing_records_authenticated_all'
  ) then
    create policy billing_records_authenticated_all on public.billing_records
      for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_activities'
      and policyname = 'payment_activities_authenticated_all'
  ) then
    create policy payment_activities_authenticated_all on public.payment_activities
      for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'utility_expenses'
      and policyname = 'utility_expenses_authenticated_all'
  ) then
    create policy utility_expenses_authenticated_all on public.utility_expenses
      for all to authenticated
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'general_expenses'
      and policyname = 'general_expenses_authenticated_all'
  ) then
    create policy general_expenses_authenticated_all on public.general_expenses
      for all to authenticated
      using (true) with check (true);
  end if;
end;
$policy$;

-- ---------------------------------------------------------------------------
-- Seed data from Google Sheets export (BUILDING_RENTALS_API CSVs)
-- Safe to re-run: ON CONFLICT upserts tenants and billing rows.
-- ---------------------------------------------------------------------------

-- Tenants (8 rows)
insert into public.tenants (unit_code, room, name, rent, move_in, deposit, status)
values
  ('APT-101', 1, 'JOEL', 10000, null, 0, 'Active'::tenant_status),
  ('APT-102', 2, 'CAROL', 4000, null, 0, 'Active'::tenant_status),
  ('APT-103', 3, 'TOYOTA', 8000, null, 0, 'Active'::tenant_status),
  ('APT-104', 4, 'JOHN WAYNE CAPILI', 5000, null, 0, 'Active'::tenant_status),
  ('APT-106', 6, 'JASON MEDIO', 5000, null, 0, 'Active'::tenant_status),
  ('COM-201', 7, 'KHAREN DENOSTA (SERVICE CENTER)', 10000, null, 0, 'Active'::tenant_status),
  ('COM-202', 8, 'MARIA FE LUMBERTO (LAUNDRY)', 8000, null, 0, 'Active'::tenant_status),
  ('APT-105', 5, 'MACOY', 4500, '2026-08-10', 0, 'Active'::tenant_status)
on conflict (room) do update set
  unit_code = excluded.unit_code,
  name = excluded.name,
  rent = excluded.rent,
  move_in = excluded.move_in,
  deposit = excluded.deposit,
  status = excluded.status;

-- Billing (34 rows)
insert into public.billing_records (
  billing_month, room, rent,
  elec_prev, elec_curr, elec_rate, elec_bill,
  water_prev, water_curr, water_rate, water_bill,
  adjustment, total_due, paid, date_paid, status
)
values
  ('2026-01-01'::date, 1, 10000, 6248, 6456, 14, 2912, 1009, 1038, 30, 870, 0, 13782, 13782, null, 'Paid'::bill_status),
  ('2026-01-01'::date, 3, 8000, 3902, 3949, 14, 658, 184, 188, 30, 120, 0, 8778, 8838, null, 'Paid'::bill_status),
  ('2026-01-01'::date, 4, 5000, 1516, 1518, 14, 28, 114, 114, 30, 0, 0, 5028, 5028, null, 'Paid'::bill_status),
  ('2026-01-01'::date, 6, 5000, 1708, 1745, 14, 518, 296, 302, 30, 180, 0, 5698, 5788, null, 'Paid'::bill_status),
  ('2026-01-01'::date, 7, 10000, 7327, 7426, 14, 1386, 349, 360, 30, 330, 0, 11716, 11881, null, 'Paid'::bill_status),
  ('2026-02-01'::date, 1, 10000, 6456, 6658, 14, 2828, 1038, 1061, 30, 690, 0, 13518, 6518, '2026-02-28'::date, 'Partial'::bill_status),
  ('2026-02-01'::date, 3, 8000, 3949, 3991, 14, 588, 188, 192, 30, 120, 0, 8708, 8768, '2026-02-19'::date, 'Paid'::bill_status),
  ('2026-02-01'::date, 4, 5000, 1518, 1523, 14, 70, 114, 115, 30, 30, 0, 5100, 5115, '2026-01-31'::date, 'Paid'::bill_status),
  ('2026-02-01'::date, 6, 5000, 1745, 1781, 14, 504, 302, 309, 30, 210, 0, 5714, 5819, '2026-02-28'::date, 'Paid'::bill_status),
  ('2026-02-01'::date, 7, 10000, 7426, 7506, 14, 1120, 360, 363, 30, 90, 0, 11210, 11255, '2026-02-28'::date, 'Paid'::bill_status),
  ('2026-03-01'::date, 1, 10000, 6658, 6834, 14, 2464, 1061, 1076, 30, 450, 0, 12914, 0, null, 'Unpaid'::bill_status),
  ('2026-03-01'::date, 3, 8000, 3991, 4052, 14, 854, 192, 199, 30, 210, 0, 9064, 9169, null, 'Paid'::bill_status),
  ('2026-03-01'::date, 4, 5000, 1523, 1535, 14, 168, 115, 117, 30, 60, 0, 5228, 5258, null, 'Paid'::bill_status),
  ('2026-03-01'::date, 6, 5000, 1781, 1809, 14, 392, 309, 314, 30, 150, 0, 5542, 5617, null, 'Paid'::bill_status),
  ('2026-03-01'::date, 7, 10000, 7506, 7572, 14, 924, 363, 366, 30, 90, 0, 11014, 10000, null, 'Paid'::bill_status),
  ('2026-03-31'::date, 1, 10000, 6834, 7010, 14, 2464, 1076, 1091, 30, 450, 999, 12914, 0, null, 'Unpaid'::bill_status),
  ('2026-04-01'::date, 3, 8000, 4052, 4126, 14, 1036, 199, 202, 30, 90, 0, 9126, 9171, null, 'Paid'::bill_status),
  ('2026-04-01'::date, 4, 5000, 1535, 1550, 14, 210, 117, 118, 30, 30, 0, 5240, 5255, null, 'Paid'::bill_status),
  ('2026-04-01'::date, 6, 5000, 1809, 1835, 14, 364, 314, 320, 30, 180, 0, 5544, 5634, null, 'Paid'::bill_status),
  ('2026-04-01'::date, 7, 10000, 7572, 7648, 14, 1064, 366, 369, 30, 90, 0, 11154, 10000, null, 'Partial'::bill_status),
  ('2026-01-01'::date, 2, 4000, 2607, 2634, 14, 378, 182, 186, 45, 180, 0, 558, 0, null, 'Vacant'::bill_status),
  ('2026-01-01'::date, 8, 8000, 1031, 1051, 14, 280, 72, 74, 45, 90, 0, 8370, 8370, null, 'Paid'::bill_status),
  ('2026-02-01'::date, 2, 4000, 2634, 2651, 14, 238, 186, 187, 45, 45, 0, 4283, 0, null, 'Vacant'::bill_status),
  ('2026-02-01'::date, 8, 8000, 1051, 1072, 14, 294, 74, 77, 45, 135, 0, 8429, 8429, '2026-02-19'::date, 'Paid'::bill_status),
  ('2026-03-01'::date, 2, 4000, 2651, 2674, 14, 322, 187, 189, 45, 90, 0, 4412, 0, null, 'Vacant'::bill_status),
  ('2026-03-01'::date, 8, 8000, 1072, 1088, 14, 224, 77, 79, 45, 90, 0, 8314, 8314, null, 'Paid'::bill_status),
  ('2026-03-31'::date, 2, 4000, 2674, 2704, 14, 420, 189, 192, 45, 135, 500, 4555, 0, null, 'Vacant'::bill_status),
  ('2026-04-01'::date, 8, 8000, 1088, 1104, 14, 224, 79, 81, 45, 90, 0, 8314, 8314, null, 'Paid'::bill_status),
  ('2026-03-31'::date, 4, 5000, 1535, 1550, 14, 210, 117, 250, 30, 3990, 0, 9200, 0, null, 'Unpaid'::bill_status),
  ('2026-05-01'::date, 2, 4000, 2704, 2800, 14, 1344, 192, 200, 30, 240, 0, 5584, 0, null, 'Unpaid'::bill_status),
  ('2026-04-30'::date, 1, 10000, 7010, 7030, 14, 280, 1091, 2000, 30, 27270, 0, 37550, 20000, null, 'Unpaid'::bill_status),
  ('2026-04-30'::date, 3, 8000, 4126, 5000, 14, 12236, 202, 350, 30, 4440, 0, 24676, 0, null, 'Unpaid'::bill_status),
  ('2026-08-01'::date, 1, 0, 7030, 7050, 14, 280, 2000, 2016, 35, 560, 100, 940, 0, null, 'Unpaid'::bill_status),
  ('2026-07-31'::date, 2, 0, 2800, 2900, 14, 1400, 200, 210, 45, 450, 0, 1850, 0, null, 'Unpaid'::bill_status)
on conflict (billing_month, room) do update set
  rent = excluded.rent,
  elec_prev = excluded.elec_prev,
  elec_curr = excluded.elec_curr,
  elec_rate = excluded.elec_rate,
  elec_bill = excluded.elec_bill,
  water_prev = excluded.water_prev,
  water_curr = excluded.water_curr,
  water_rate = excluded.water_rate,
  water_bill = excluded.water_bill,
  adjustment = excluded.adjustment,
  total_due = excluded.total_due,
  paid = excluded.paid,
  date_paid = excluded.date_paid,
  status = excluded.status;
