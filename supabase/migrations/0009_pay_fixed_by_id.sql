-- ============================================================
-- AppBalance — Fix: "Pagar" en gastos fijos siempre crea el consumo
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente.
--
-- Problema: pay_fixed_expense(p_payment_id) exige que YA exista la fila
-- de período (fixed_expense_payments) del mes. Esa fila solo la genera
-- ensure_fixed_expense_periods() para recurrence='monthly'. Para gastos
-- semanales/anuales —o cuando el período aún no se generó— payment_id
-- llega NULL a la vista, el botón "Pagar" queda deshabilitado y no crea
-- ningún gasto.
--
-- Solución: nueva RPC que recibe el fixed_expense_id, garantiza el
-- período del mes en curso (lo crea si falta, para cualquier recurrencia)
-- y luego lo salda reutilizando la lógica de pay_fixed_expense.
-- ============================================================

create or replace function pay_fixed_expense_current(
  p_fixed_expense_id  uuid,
  p_payment_method_id uuid default null,
  p_occurred_at       timestamptz default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  uid        uuid := auth.uid();
  v_period   date := date_trunc('month', current_date)::date;
  v_last_day int  := extract(day from (date_trunc('month', current_date)
                       + interval '1 month - 1 day'))::int;
  v_fe       record;
  v_due      date;
  v_pay_id   uuid;
begin
  if uid is null then
    raise exception 'pay_fixed_expense_current: no hay usuario autenticado';
  end if;

  -- El gasto fijo debe existir y ser del usuario.
  select id, coalesce(due_day, 1) as due_day
    into v_fe
    from fixed_expenses
   where id = p_fixed_expense_id and user_id = uid;

  if not found then
    raise exception 'gasto fijo no encontrado o ajeno';
  end if;

  -- Garantiza el período del mes en curso (no duplica).
  v_due := v_period + (least(v_fe.due_day, v_last_day) - 1);
  insert into fixed_expense_payments (fixed_expense_id, period, due_date, status)
  values (p_fixed_expense_id, v_period, v_due, 'unpaid')
  on conflict (fixed_expense_id, period) do nothing;

  select id into v_pay_id
    from fixed_expense_payments
   where fixed_expense_id = p_fixed_expense_id and period = v_period;

  -- Reutiliza la RPC atómica existente (crea el consumo y enlaza).
  return pay_fixed_expense(v_pay_id, p_payment_method_id, p_occurred_at);
end $$;

grant execute on function pay_fixed_expense_current(uuid, uuid, timestamptz) to authenticated;
