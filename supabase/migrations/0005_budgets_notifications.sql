-- ============================================================
-- AppBalance — Fase 2: presupuestos + notificaciones (banner in-app)
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente: puedes correrlo más de una vez sin duplicar.
--
-- Las tablas budgets / notifications ya existen (0001). Aquí van:
--   1) v_budget_status: gasto del período en curso por presupuesto.
--   2) refresh_notifications: genera avisos (presupuesto superado y
--      gastos fijos vencidos / por vencer) con dedup por período.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Vista de estado de presupuestos.
--    Calcula el gasto del período actual (semanal o mensual) según el
--    alcance (global / categoría / etiqueta). security_invoker para RLS.
-- ------------------------------------------------------------
create or replace view v_budget_status
with (security_invoker = on) as
select
  b.id           as budget_id,
  b.name,
  b.scope,
  b.category_id,
  b.tag_id,
  b.limit_cents,
  b.period,
  c.name         as category_name,
  c.icon         as category_icon,
  tg.name        as tag_name,
  (case b.period
     when 'weekly' then date_trunc('week',  current_date)
     else               date_trunc('month', current_date)
   end)::date    as period_start,
  coalesce((
    select sum(t.amount_cents)
    from transactions t
    where t.user_id = b.user_id
      and t.type = 'expense'
      and t.occurred_at >= (case b.period
            when 'weekly' then date_trunc('week',  current_date)
            else               date_trunc('month', current_date)
          end)
      and (
        b.scope = 'global'
        or (b.scope = 'category' and t.category_id = b.category_id)
        or (b.scope = 'tag' and exists (
              select 1 from transaction_tags tt
              where tt.transaction_id = t.id and tt.tag_id = b.tag_id))
      )
  ), 0)::bigint  as spent_cents
from budgets b
left join categories c on c.id = b.category_id
left join tags tg      on tg.id = b.tag_id
where b.active;

-- ------------------------------------------------------------
-- 2) refresh_notifications: crea avisos nuevos sin duplicar.
--    Dedup por (kind, payload.ref_id, payload.period). La app la llama
--    al abrir Inicio; el banner muestra los no leídos (read_at is null).
--    kinds: 'budget_exceeded', 'fixed_overdue', 'fixed_due'.
-- ------------------------------------------------------------
create or replace function refresh_notifications()
returns void
language plpgsql
security invoker
as $$
declare
  uid       uuid := auth.uid();
  b         record;
  f         record;
  v_period  text;
  v_day     int;
  v_scope   text;
begin
  if uid is null then
    raise exception 'refresh_notifications: no hay usuario autenticado';
  end if;

  -- ---- Presupuestos superados ----
  for b in
    select * from v_budget_status where spent_cents > limit_cents
  loop
    v_period := to_char(b.period_start, 'YYYY-MM-DD');
    v_scope := case b.scope
                 when 'category' then coalesce(b.category_name, 'categoría')
                 when 'tag'      then coalesce(b.tag_name, 'etiqueta')
                 else 'gasto total'
               end;
    if not exists (
      select 1 from notifications n
      where n.user_id = uid
        and n.kind = 'budget_exceeded'
        and n.payload->>'ref_id' = b.budget_id::text
        and n.payload->>'period' = v_period
    ) then
      insert into notifications (user_id, kind, title, body, payload)
      values (
        uid, 'budget_exceeded',
        'Presupuesto superado',
        coalesce(b.name, initcap(v_scope)) || ' pasó el límite de este '
          || case b.period when 'weekly' then 'semana' else 'mes' end || '.',
        jsonb_build_object(
          'ref_id', b.budget_id, 'period', v_period,
          'spent_cents', b.spent_cents, 'limit_cents', b.limit_cents)
      );
    end if;
  end loop;

  -- ---- Gastos fijos vencidos / por vencer (mes en curso) ----
  for f in
    select p.id as payment_id, p.due_date, p.status, fe.name
    from fixed_expense_payments p
    join fixed_expenses fe on fe.id = p.fixed_expense_id
    where fe.user_id = uid
      and p.period = date_trunc('month', current_date)::date
      and p.status <> 'paid'
  loop
    v_period := to_char(current_date, 'YYYY-MM');
    v_day := extract(day from f.due_date)::int;

    if f.due_date < current_date then
      -- Atrasado
      if not exists (
        select 1 from notifications n
        where n.user_id = uid and n.kind = 'fixed_overdue'
          and n.payload->>'ref_id' = f.payment_id::text
          and n.payload->>'period' = v_period
      ) then
        insert into notifications (user_id, kind, title, body, payload)
        values (
          uid, 'fixed_overdue', 'Gasto fijo atrasado',
          f.name || ' venció el ' || v_day || ' y sigue sin pagar.',
          jsonb_build_object('ref_id', f.payment_id, 'period', v_period)
        );
      end if;
    elsif f.due_date <= current_date + 3 then
      -- Por vencer (dentro de 3 días)
      if not exists (
        select 1 from notifications n
        where n.user_id = uid and n.kind = 'fixed_due'
          and n.payload->>'ref_id' = f.payment_id::text
          and n.payload->>'period' = v_period
      ) then
        insert into notifications (user_id, kind, title, body, payload)
        values (
          uid, 'fixed_due', 'Gasto fijo por vencer',
          f.name || ' vence el ' || v_day || '.',
          jsonb_build_object('ref_id', f.payment_id, 'period', v_period)
        );
      end if;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3) Permisos.
-- ------------------------------------------------------------
grant select on v_budget_status to authenticated;
grant execute on function refresh_notifications() to authenticated;
