-- ============================================================
-- AppBalance — Categorías por defecto con iconos PNG
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- Idempotente.
--
-- Cambios:
--   1) seed_user_defaults() crea 5 categorías base con iconos PNG
--      (nombre del archivo en public/iconos-categoria) en vez de emojis.
--   2) Backfill: inserta esas 5 categorías en los usuarios que YA existen,
--      sin duplicar ni borrar las viejas.
--   3) Remap: reasigna los registros que apuntaban a PNG que ya NO existen
--      (set de iconos actualizado) a su equivalente actual.
--
-- La columna categories.icon guarda el NOMBRE DE ARCHIVO del PNG
-- (ej. 'taxi.png'). La app lo resuelve a /iconos-categoria/<archivo>.
-- ============================================================

-- 1) Nuevos defaults para usuarios FUTUROS.
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

  -- Categorías base (iconos PNG).
  insert into categories (user_id, name, icon, color)
  select uid, c.name, c.icon, c.color
  from (values
    ('Transporte',     'taxi.png',            '#C98A4B'),
    ('Comida',         'restaurante.png',     '#9B6A50'),
    ('Entretenimiento','entretenimiento.png', '#A9A491'),
    ('Luz',            'perno-de-luz.png',    '#C9A57E'),
    ('Agua',           'gota-de-agua.png',    '#6B8F71')
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

  -- Catálogo de impuestos: IVA.
  insert into tax_types (user_id, name, kind, default_rate, active)
  select uid, 'IVA', 'tax',
         (select iva_rate from app_settings where user_id = uid),
         true
  where not exists (
    select 1 from tax_types x where x.user_id = uid and x.name = 'IVA'
  );
end $$;

-- 2) Backfill para usuarios YA existentes (corre como service role: auth.uid()
--    es null aquí, por eso recorremos auth.users directamente).
insert into categories (user_id, name, icon, color)
select u.id, c.name, c.icon, c.color
from auth.users u
cross join (values
  ('Transporte',     'taxi.png',            '#C98A4B'),
  ('Comida',         'restaurante.png',     '#9B6A50'),
  ('Entretenimiento','entretenimiento.png', '#A9A491'),
  ('Luz',            'perno-de-luz.png',    '#C9A57E'),
  ('Agua',           'gota-de-agua.png',    '#6B8F71')
) as c(name, icon, color)
where not exists (
  select 1 from categories x where x.user_id = u.id and x.name = c.name
);

-- 3) Remap de registros existentes cuyos PNG ya no existen en el nuevo set.
--    Idempotente: tras correr una vez, ninguno de los nombres viejos queda,
--    así que un segundo run no cambia nada.
update categories set icon = case icon
  when 'food-and-restaurant.png'      then 'restaurante.png'
  when 'carrito-de-supermercado.png'  then 'carrito-de-compras.png'
  when 'taza-de-cafe.png'             then 'restaurante.png'
  when 'medidor-de-electricidad.png'  then 'perno-de-luz.png'
  when 'grifo.png'                    then 'gota-de-agua.png'
  when 'caja-de-regalo.png'           then 'entradas.png'
  when 'boutique.png'                 then 'tienda-de-ropa.png'
  when 'necesitar.png'                then 'elipsis.png'
  when 'lapiz-labial.png'             then 'kit-de-maquillaje.png'
  when 'proteccion-de-la-piel.png'    then 'cuidado-del-cabello.png'
  when 'espiritu.png'                 then 'elipsis.png'
  else icon
end
where icon in (
  'food-and-restaurant.png',
  'carrito-de-supermercado.png',
  'taza-de-cafe.png',
  'medidor-de-electricidad.png',
  'grifo.png',
  'caja-de-regalo.png',
  'boutique.png',
  'necesitar.png',
  'lapiz-labial.png',
  'proteccion-de-la-piel.png',
  'espiritu.png'
);
