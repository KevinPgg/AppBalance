-- ============================================================
-- AppBalance — Fase 2: gastos fijos (períodos + saldar + estados)
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente: puedes correrlo más de una vez sin duplicar.
--
-- Las tablas fixed_expenses / fixed_expense_payments ya existen (0001).
-- Aquí van la lógica de períodos, el saldado con un consumo y una vista
-- del estado del mes en curso para la tarjeta de Inicio.
-- ============================================================

-- ------------------------------------------------------------
-- 1) ensure_fixed_expense_periods: genera el período del mes actual
--    para cada gasto fijo mensual activo y marca como 'overdue' los
--    no pagados ya vencidos. Idempotente (no duplica períodos).
--    La app la llama al entrar a Inicio.
-- ------------------------------------------------------------
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

  -- Marca vencidos los no pagados cuya fecha límite ya pasó.
  -- OJO: el alias de tabla NO puede llamarse 'fe' porque colisiona con la
  -- variable record 'fe' declarada arriba (Postgres: "fe.id is ambiguous").
  update fixed_expense_payments p
  set status = 'overdue'
  from fixed_expenses fx
  where p.fixed_expense_id = fx.id
    and fx.user_id = uid
    and p.status = 'unpaid'
    and p.due_date < current_date;
end $$;

-- ------------------------------------------------------------
-- 2) pay_fixed_expense: salda un período creando un consumo y
--    enlazándolo. Atómico. El consumo hereda categoría y monto del
--    gasto fijo (subtotal = total, sin ajustes, tax_status definido).
-- ------------------------------------------------------------
create or replace function pay_fixed_expense(
  p_payment_id        uuid,
  p_payment_method_id uuid default null,
  p_occurred_at       timestamptz default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  uid    uuid := auth.uid();
  v_fe   record;
  v_pay  record;
  new_tx uuid;
begin
  if uid is null then
    raise exception 'pay_fixed_expense: no hay usuario autenticado';
  end if;

  select p.*, fe.name, fe.amount_cents, fe.category_id, fe.user_id as fe_user
    into v_pay
    from fixed_expense_payments p
    join fixed_expenses fe on fe.id = p.fixed_expense_id
   where p.id = p_payment_id;

  if not found or v_pay.fe_user <> uid then
    raise exception 'período de gasto fijo no encontrado o ajeno';
  end if;
  if v_pay.status = 'paid' then
    raise exception 'este gasto fijo ya está pagado';
  end if;

  insert into transactions (
    user_id, type, subtotal_cents, amount_cents, occurred_at,
    category_id, payment_method_id, merchant, note,
    source, is_fixed_expense, tax_status
  ) values (
    uid, 'expense', v_pay.amount_cents, v_pay.amount_cents,
    coalesce(p_occurred_at, now()),
    v_pay.category_id, p_payment_method_id, v_pay.name,
    'Gasto fijo', 'manual', true, 'definido'
  )
  returning id into new_tx;

  update fixed_expense_payments
  set status = 'paid', transaction_id = new_tx, paid_at = now()
  where id = p_payment_id;

  return new_tx;
end $$;

-- ------------------------------------------------------------
-- 3) unpay_fixed_expense: revierte el saldado. Borra el consumo
--    enlazado (si sigue existiendo) y devuelve el período a unpaid/overdue.
-- ------------------------------------------------------------
create or replace function unpay_fixed_expense(p_payment_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  uid   uuid := auth.uid();
  v_pay record;
begin
  if uid is null then
    raise exception 'unpay_fixed_expense: no hay usuario autenticado';
  end if;

  select p.*, fe.user_id as fe_user
    into v_pay
    from fixed_expense_payments p
    join fixed_expenses fe on fe.id = p.fixed_expense_id
   where p.id = p_payment_id;

  if not found or v_pay.fe_user <> uid then
    raise exception 'período de gasto fijo no encontrado o ajeno';
  end if;

  if v_pay.transaction_id is not null then
    delete from transactions where id = v_pay.transaction_id and user_id = uid;
  end if;

  update fixed_expense_payments
  set status = case when due_date < current_date then 'overdue' else 'unpaid' end,
      transaction_id = null,
      paid_at = null
  where id = p_payment_id;
end $$;

-- ------------------------------------------------------------
-- 4) Vista del estado del mes en curso (alimenta la tarjeta de Inicio).
--    security_invoker para que respete la RLS del usuario.
-- ------------------------------------------------------------
create or replace view v_fixed_expense_current
with (security_invoker = on) as
select
  fe.id            as fixed_expense_id,
  fe.name,
  fe.amount_cents,
  fe.category_id,
  fe.due_day,
  fe.recurrence,
  fe.active,
  c.name           as category_name,
  c.icon           as category_icon,
  p.id             as payment_id,
  p.period,
  p.due_date,
  coalesce(p.status, 'unpaid') as status,
  p.transaction_id,
  p.paid_at
from fixed_expenses fe
left join categories c on c.id = fe.category_id
left join fixed_expense_payments p
  on p.fixed_expense_id = fe.id
 and p.period = date_trunc('month', current_date)::date
where fe.active;

-- ------------------------------------------------------------
-- 5) Permisos de ejecución.
-- ------------------------------------------------------------
grant execute on function ensure_fixed_expense_periods() to authenticated;
grant execute on function pay_fixed_expense(uuid, uuid, timestamptz) to authenticated;
grant execute on function unpay_fixed_expense(uuid) to authenticated;
grant select on v_fixed_expense_current to authenticated;
