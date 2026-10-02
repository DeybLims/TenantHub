-- Atomic "Pay Balance": applies one payment across a room's unpaid bills
-- oldest-first, logs one payment activity per bill, and carries any remainder
-- to the tenant's credit — all in a single transaction (all or nothing).
-- Safe to re-run.

-- Payment dates are Philippine calendar days; the server clock runs in UTC.
alter table public.payment_activities
  alter column payment_date set default (timezone('Asia/Manila', now()))::date;

create or replace function public.apply_tenant_payment(
  p_room integer,
  p_amount numeric,
  p_payment_date date default null,
  p_method text default 'other',
  p_reference text default ''
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_remaining numeric(12, 2) := round(coalesce(p_amount, 0), 2);
  v_payment_date date := coalesce(p_payment_date, (timezone('Asia/Manila', now()))::date);
  v_method payment_method;
  v_from_month date;
  v_bill record;
  v_applied numeric(12, 2);
  v_new_paid numeric(12, 2);
  v_allocations jsonb := '[]'::jsonb;
  v_last_activity_id uuid;
begin
  if v_remaining <= 0 then
    raise exception 'Payment amount must be greater than zero.'
      using errcode = '22023';
  end if;

  v_method := case
    when p_method in ('cash', 'bank', 'online') then p_method::payment_method
    else 'other'::payment_method
  end;

  -- Locking the tenant row serializes concurrent payments for the same room.
  select date_trunc('month', coalesce(t.move_in, t.lease_start))::date
    into v_from_month
    from public.tenants t
   where t.room = p_room
     for update;

  if not found then
    raise exception 'No tenant found for room %.', p_room
      using errcode = 'P0002';
  end if;

  -- Bills before move-in are hidden in the app, so they are never paid here.
  for v_bill in
    select b.id, b.billing_month, b.total_due, b.paid
      from public.billing_records b
     where b.room = p_room
       and b.status <> 'Vacant'
       and b.total_due - b.paid > 0
       and (v_from_month is null or b.billing_month >= v_from_month)
     order by b.billing_month asc
       for update
  loop
    exit when v_remaining <= 0;

    v_applied := least(v_remaining, v_bill.total_due - v_bill.paid);
    v_new_paid := v_bill.paid + v_applied;

    update public.billing_records
       set paid = v_new_paid,
           status = case
             when v_new_paid >= total_due then 'Paid'::bill_status
             else 'Partial'::bill_status
           end,
           date_paid = v_payment_date
     where id = v_bill.id;

    insert into public.payment_activities
      (billing_record_id, payment_date, amount, method, reference_notes)
    values
      (v_bill.id, v_payment_date, v_applied, v_method, coalesce(trim(p_reference), ''))
    returning id into v_last_activity_id;

    v_allocations := v_allocations || jsonb_build_object(
      'billing_record_id', v_bill.id,
      'billing_month', v_bill.billing_month,
      'amount', v_applied,
      'new_paid', v_new_paid
    );
    v_remaining := v_remaining - v_applied;
  end loop;

  if v_remaining > 0 then
    update public.tenants
       set credit_balance = credit_balance + v_remaining
     where room = p_room;

    if v_last_activity_id is not null then
      update public.payment_activities
         set reference_notes = trim(
               reference_notes || ' (+₱' || to_char(v_remaining, 'FM999,999,990.00')
               || ' carried over as credit)'
             )
       where id = v_last_activity_id;
    end if;
  end if;

  return jsonb_build_object(
    'allocations', v_allocations,
    'credit_added', v_remaining
  );
end;
$$;

-- Only the server (service role) may move money.
revoke all on function public.apply_tenant_payment(integer, numeric, date, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_tenant_payment(integer, numeric, date, text, text)
  to service_role;

notify pgrst, 'reload schema';
