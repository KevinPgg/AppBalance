-- ============================================================
-- AppBalance — Fase 1.5: editar transacciones, etiquetas y ajustes
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente: puedes correrlo más de una vez sin duplicar.
--
-- Incluye:
--   1) create_full_transaction extendida con p_tag_ids (etiquetas) y
--      soporte de p_source = 'loan' para marcar préstamos.
--   2) update_full_transaction: edita una transacción y reescribe sus
--      ajustes + etiquetas ATÓMICAMENTE (un solo chequeo de cuadre al commit).
--   3) set_iva_rate: cambia la tasa global de IVA y la sincroniza con el
--      tax_type 'IVA' en una sola transacción.
--   4) seed_user_defaults siembra una etiqueta base "Préstamo".
-- ============================================================

-- ------------------------------------------------------------
-- 0) Etiqueta base "Préstamo" (se añade a la siembra existente).
--    Reusa la firma idempotente: no duplica si ya existe.
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

  insert into app_settings (user_id)
  values (uid)
  on conflict (user_id) do nothing;

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

  insert into tax_types (user_id, name, kind, default_rate, active)
  select uid, 'IVA', 'tax',
         (select iva_rate from app_settings where user_id = uid),
         true
  where not exists (
    select 1 from tax_types x where x.user_id = uid and x.name = 'IVA'
  );

  -- Etiqueta base para marcar préstamos (opcional; el marcado real va por source).
  insert into tags (user_id, name, color)
  select uid, 'Préstamo', '#A14B3C'
  where not exists (
    select 1 from tags x where x.user_id = uid and x.name = 'Préstamo'
  );
end $$;

-- ------------------------------------------------------------
-- 1) create_full_transaction: ahora con p_tag_ids.
--    Se elimina la firma antigua para evitar ambigüedad de overload.
-- ------------------------------------------------------------
drop function if exists create_full_transaction(
  text, bigint, bigint, timestamptz, uuid, uuid, text, text, text, text, text, jsonb
);

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
  p_adjustments       jsonb default '[]'::jsonb,
  p_tag_ids           uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security invoker
as $$
declare
  uid    uuid := auth.uid();
  new_id uuid;
  adj    jsonb;
  tid    uuid;
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

  foreach tid in array coalesce(p_tag_ids, '{}'::uuid[])
  loop
    insert into transaction_tags (transaction_id, tag_id)
    values (new_id, tid)
    on conflict do nothing;
  end loop;

  return new_id;
end $$;

-- ------------------------------------------------------------
-- 2) update_full_transaction: edita y reescribe ajustes + etiquetas.
--    Borra ajustes/tags previos e inserta los nuevos dentro de la
--    misma transacción → el trigger de cuadre (deferred) corre una vez
--    al commit con el estado final. Verifica propiedad por user_id.
-- ------------------------------------------------------------
create or replace function update_full_transaction(
  p_id                uuid,
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
  p_adjustments       jsonb default '[]'::jsonb,
  p_tag_ids           uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
  adj jsonb;
  tid uuid;
begin
  if uid is null then
    raise exception 'update_full_transaction: no hay usuario autenticado';
  end if;

  -- Propiedad (además de RLS) y existencia.
  if not exists (select 1 from transactions where id = p_id and user_id = uid) then
    raise exception 'transacción no encontrada o ajena';
  end if;

  update transactions set
    subtotal_cents    = p_subtotal_cents,
    amount_cents      = p_amount_cents,
    occurred_at       = coalesce(p_occurred_at, occurred_at),
    category_id       = p_category_id,
    payment_method_id = p_payment_method_id,
    merchant          = p_merchant,
    note              = p_note,
    income_origin     = p_income_origin,
    source            = coalesce(p_source, 'manual'),
    tax_status        = coalesce(p_tax_status, 'por_definir'),
    updated_at        = now()
  where id = p_id and user_id = uid;

  -- Reescribir ajustes.
  delete from transaction_adjustments where transaction_id = p_id;
  for adj in select * from jsonb_array_elements(coalesce(p_adjustments, '[]'::jsonb))
  loop
    insert into transaction_adjustments (
      transaction_id, kind, tax_type_id, label, rate, amount_cents
    ) values (
      p_id,
      adj->>'kind',
      nullif(adj->>'tax_type_id', '')::uuid,
      adj->>'label',
      nullif(adj->>'rate', '')::numeric,
      (adj->>'amount_cents')::bigint
    );
  end loop;

  -- Reescribir etiquetas.
  delete from transaction_tags where transaction_id = p_id;
  foreach tid in array coalesce(p_tag_ids, '{}'::uuid[])
  loop
    insert into transaction_tags (transaction_id, tag_id)
    values (p_id, tid)
    on conflict do nothing;
  end loop;

  return p_id;
end $$;

-- ------------------------------------------------------------
-- 3) set_iva_rate: cambia la tasa global y sincroniza el tax_type 'IVA'.
-- ------------------------------------------------------------
create or replace function set_iva_rate(p_rate numeric)
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'set_iva_rate: no hay usuario autenticado';
  end if;
  if p_rate < 0 or p_rate > 1 then
    raise exception 'tasa de IVA fuera de rango (0–1): %', p_rate;
  end if;

  update app_settings set iva_rate = p_rate, updated_at = now()
  where user_id = uid;

  update tax_types set default_rate = p_rate
  where user_id = uid and name = 'IVA';
end $$;

-- ------------------------------------------------------------
-- 4) Permisos de ejecución.
-- ------------------------------------------------------------
grant execute on function create_full_transaction(
  text, bigint, bigint, timestamptz, uuid, uuid, text, text, text, text, text, jsonb, uuid[]
) to authenticated;
grant execute on function update_full_transaction(
  uuid, bigint, bigint, timestamptz, uuid, uuid, text, text, text, text, text, jsonb, uuid[]
) to authenticated;
grant execute on function set_iva_rate(numeric) to authenticated;
