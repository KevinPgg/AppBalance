-- ============================================================
-- AppBalance — Fase 1: seed del catálogo base + RPC de guardado
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente: puedes correrlo más de una vez sin duplicar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) SEED DEL CATÁLOGO BASE PARA EL USUARIO ACTUAL
--    No se puede sembrar con un INSERT plano porque user_id = auth.uid()
--    y en el SQL Editor auth.uid() es null. Por eso es una función que
--    la app llama al iniciar sesión (corre con el uid del usuario).
-- ------------------------------------------------------------
create or replace function seed_user_defaults()
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'seed_user_defaults: no hay usuario autenticado';
  end if;

  -- Ajustes globales (IVA 15% por defecto, editable luego).
  insert into app_settings (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  -- Categorías base.
  insert into categories (user_id, name, icon, color)
  select uid, c.name, c.icon, c.color
  from (values
    ('Café',       '☕', '#5E3B30'),
    ('Comida',     '🍽️', '#9B6A50'),
    ('Mercado',    '🛒', '#6B8F71'),
    ('Transporte', '🚌', '#C98A4B'),
    ('Ocio',       '🎬', '#A9A491'),
    ('Otros',      '•',  '#7A6E64')
  ) as c(name, icon, color)
  where not exists (
    select 1 from categories x where x.user_id = uid and x.name = c.name
  );

  -- Medios de pago base.
  insert into payment_methods (user_id, kind, label)
  select uid, p.kind, p.label
  from (values
    ('efectivo',      'Efectivo'),
    ('debito',        'Débito'),
    ('credito',       'Crédito'),
    ('transferencia', 'Transferencia'),
    ('indefinido',    'Sin definir')
  ) as p(kind, label)
  where not exists (
    select 1 from payment_methods x where x.user_id = uid and x.kind = p.kind
  );

  -- Catálogo de impuestos: IVA (tasa tomada de app_settings).
  insert into tax_types (user_id, name, kind, default_rate, active)
  select uid, 'IVA', 'tax',
         (select iva_rate from app_settings where user_id = uid),
         true
  where not exists (
    select 1 from tax_types x where x.user_id = uid and x.name = 'IVA'
  );
end $$;

-- ------------------------------------------------------------
-- 2) RPC: crear transacción + ajustes ATÓMICAMENTE
--    El trigger adj_balance_check es deferrable initially deferred:
--    se valida al COMMIT. Al meter la transacción y todos sus ajustes
--    dentro de una sola función, el cuadre se verifica una vez al final.
--    p_adjustments: jsonb array de objetos
--      { "kind": "tax|surcharge|discount", "label": text,
--        "rate": number|null, "amount_cents": int, "tax_type_id": uuid|null }
-- ------------------------------------------------------------
create or replace function create_full_transaction(
  p_type              text,
  p_subtotal_cents    bigint,
  p_amount_cents      bigint,
  p_occurred_at       timestamptz,
  p_category_id       uuid,
  p_payment_method_id uuid,
  p_merchant          text,
  p_note              text,
  p_income_origin     text,
  p_tax_status        text,
  p_source            text default 'manual',
  p_adjustments       jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
as $$
declare
  uid    uuid := auth.uid();
  new_id uuid;
  adj    jsonb;
begin
  if uid is null then
    raise exception 'create_full_transaction: no hay usuario autenticado';
  end if;

  if p_type not in ('expense', 'income') then
    raise exception 'tipo inválido: %', p_type;
  end if;

  insert into transactions (
    user_id, type, subtotal_cents, amount_cents, occurred_at,
    category_id, payment_method_id, merchant, note,
    income_origin, source, tax_status
  ) values (
    uid, p_type, p_subtotal_cents, p_amount_cents,
    coalesce(p_occurred_at, now()),
    p_category_id, p_payment_method_id, p_merchant, p_note,
    p_income_origin, coalesce(p_source, 'manual'),
    coalesce(p_tax_status, 'por_definir')
  )
  returning id into new_id;

  -- Insertar todos los ajustes. El chequeo de cuadre corre al commit.
  for adj in select * from jsonb_array_elements(coalesce(p_adjustments, '[]'::jsonb))
  loop
    insert into transaction_adjustments (
      transaction_id, kind, tax_type_id, label, rate, amount_cents
    ) values (
      new_id,
      adj->>'kind',
      nullif(adj->>'tax_type_id', '')::uuid,
      adj->>'label',
      nullif(adj->>'rate', '')::numeric,
      (adj->>'amount_cents')::bigint
    );
  end loop;

  return new_id;
end $$;

-- ------------------------------------------------------------
-- 3) Permisos de ejecución para usuarios autenticados.
-- ------------------------------------------------------------
grant execute on function seed_user_defaults() to authenticated;
grant execute on function create_full_transaction(
  text, bigint, bigint, timestamptz, uuid, uuid, text, text, text, text, text, jsonb
) to authenticated;
