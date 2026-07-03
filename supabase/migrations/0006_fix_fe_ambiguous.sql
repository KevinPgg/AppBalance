-- ============================================================
-- AppBalance — Fix: "column reference fe.id is ambiguous"
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente.
--
-- Causa: en ensure_fixed_expense_periods() la variable record 'fe'
-- chocaba con el alias de tabla 'fe' del UPDATE final. Postgres no podía
-- resolver 'fe.id'. Aquí se recrea la función con el alias renombrado a 'fx'.
-- ============================================================

create or replace function ensure_fixed_expense_periods()
returns void
language plpgsql
security invoker
as $$
declare
  uid        uuid := auth.uid();
  v_period   date := date_trunc('month', current_date)::date;
  v_last_day int  := extract(day from (date_trunc('month', current_date)
                       + interval '1 month - 1 day'))::int;
  fe         record;
  v_due      date;
begin
  if uid is null then
    raise exception 'ensure_fixed_expense_periods: no hay usuario autenticado';
  end if;

  for fe in
    select id, coalesce(due_day, 1) as due_day
    from fixed_expenses
    where user_id = uid and active and recurrence = 'monthly'
  loop
    v_due := v_period + (least(fe.due_day, v_last_day) - 1);
    insert into fixed_expense_payments (fixed_expense_id, period, due_date, status)
    values (fe.id, v_period, v_due, 'unpaid')
    on conflict (fixed_expense_id, period) do nothing;
  end loop;

  -- Alias 'fx' (no 'fe') para no colisionar con la variable record 'fe'.
  update fixed_expense_payments p
  set status = 'overdue'
  from fixed_expenses fx
  where p.fixed_expense_id = fx.id
    and fx.user_id = uid
    and p.status = 'unpaid'
    and p.due_date < current_date;
end $$;
