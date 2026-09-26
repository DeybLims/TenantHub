-- Seed 3 rooms with older unpaid/partial balances for Pay Balance testing.
-- Run in Supabase SQL Editor. Safe to re-run (upserts on billing_month + room).
--
-- Rooms:
--   1 APT-101 Joel   — Jul unpaid + Aug partial (oldest unpaid first)
--   2 APT-102 Carol  — Jul unpaid + Aug unpaid
--   5 APT-105 Macoy  — Jul unpaid + Aug partial
--
-- Also sets Move-in so occupancy filter keeps these bills visible.

update public.tenants
set
  move_in = coalesce(move_in, '2026-06-01'::date),
  lease_start = coalesce(lease_start, '2026-06-01'::date),
  status = 'Active'
where room in (1, 2, 5);

insert into public.billing_records (
  billing_month, room, rent,
  elec_prev, elec_curr, elec_rate, elec_bill,
  water_prev, water_curr, water_rate, water_bill,
  adjustment, total_due, paid, date_paid, status,
  billing_date, due_date
)
values
  -- Joel APT-101
  (
    '2026-07-01'::date, 1, 10000,
    7000, 7100, 14, 1400,
    2000, 2020, 30, 600,
    0, 12000, 0, null, 'Unpaid'::bill_status,
    '2026-07-15'::date, '2026-07-31'::date
  ),
  (
    '2026-08-01'::date, 1, 10000,
    7100, 7200, 14, 1400,
    2020, 2040, 30, 600,
    0, 12000, 3000, '2026-08-20'::date, 'Partial'::bill_status,
    '2026-08-15'::date, '2026-08-31'::date
  ),
  (
    '2026-09-01'::date, 1, 10000,
    7200, 7300, 14, 1400,
    2040, 2060, 30, 600,
    0, 12000, 0, null, 'Unpaid'::bill_status,
    '2026-09-15'::date, '2026-09-30'::date
  ),

  -- Carol APT-102
  (
    '2026-07-01'::date, 2, 4000,
    2800, 2900, 14, 1400,
    200, 210, 45, 450,
    0, 5850, 0, null, 'Unpaid'::bill_status,
    '2026-07-15'::date, '2026-07-31'::date
  ),
  (
    '2026-08-01'::date, 2, 4000,
    2900, 3000, 14, 1400,
    210, 220, 45, 450,
    0, 5850, 0, null, 'Unpaid'::bill_status,
    '2026-08-15'::date, '2026-08-31'::date
  ),
  (
    '2026-09-01'::date, 2, 4000,
    3000, 3100, 14, 1400,
    220, 230, 45, 450,
    0, 5850, 1000, '2026-09-10'::date, 'Partial'::bill_status,
    '2026-09-15'::date, '2026-09-30'::date
  ),

  -- Macoy APT-105
  (
    '2026-07-01'::date, 5, 4500,
    1500, 1600, 14, 1400,
    100, 110, 30, 300,
    0, 6200, 0, null, 'Unpaid'::bill_status,
    '2026-07-15'::date, '2026-07-31'::date
  ),
  (
    '2026-08-01'::date, 5, 4500,
    1600, 1700, 14, 1400,
    110, 120, 30, 300,
    0, 6200, 2000, '2026-08-18'::date, 'Partial'::bill_status,
    '2026-08-15'::date, '2026-08-31'::date
  ),
  (
    '2026-09-01'::date, 5, 4500,
    1700, 1800, 14, 1400,
    120, 130, 30, 300,
    0, 6200, 0, null, 'Unpaid'::bill_status,
    '2026-09-15'::date, '2026-09-30'::date
  )
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
  status = excluded.status,
  billing_date = excluded.billing_date,
  due_date = excluded.due_date;
