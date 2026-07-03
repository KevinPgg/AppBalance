-- ============================================================
-- AppBalance — Migración inicial (Fase 0)
-- App personal de un solo usuario. RLS por auth.uid().
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- ============================================================

-- ---------- USUARIO + AJUSTES GLOBALES ----------
create table if not exists app_settings (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    currency   char(3) not null default 'USD',
    iva_rate   numeric(6,4) not null default 0.15,
    updated_at timestamptz not null default now()
);

-- ---------- CATEGORÍAS ----------
create table if not exists categories (
    id      uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name    text not null,
    icon    text,
    color   text
);

-- ---------- ETIQUETAS ----------
create table if not exists tags (
    id      uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name    text not null,
    color   text,
    unique (user_id, name)
);

-- ---------- MÉTODOS DE PAGO ----------
create table if not exists payment_methods (
    id      uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    kind    text not null check (kind in
             ('indefinido','efectivo','transferencia','debito','credito')),
    label   text
);

-- ---------- CATÁLOGO DE IMPUESTOS / RECARGOS ----------
create table if not exists tax_types (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name         text not null,
    kind         text not null check (kind in ('tax','surcharge')),
    default_rate numeric(6,4),
    active       boolean not null default true,
    unique (user_id, name)
);

create table if not exists payment_method_adjustments (
    payment_method_id uuid references payment_methods(id) on delete cascade,
    tax_type_id       uuid references tax_types(id) on delete cascade,
    rate              numeric(6,4),
    primary key (payment_method_id, tax_type_id)
);

-- ---------- PROMOCIONES / DESCUENTOS ----------
create table if not exists promotions (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name          text not null,
    discount_kind text not null check (discount_kind in ('percentage','amount')),
    value         numeric(12,4) not null,
    day_of_week   smallint check (day_of_week between 0 and 6),
    category_id   uuid references categories(id) on delete set null,
    merchant      text,
    active        boolean not null default true
);

-- ---------- TRANSACCIONES ----------
create table if not exists transactions (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
    type              text not null check (type in ('expense','income')),
    subtotal_cents    bigint not null check (subtotal_cents >= 0),
    amount_cents      bigint not null check (amount_cents >= 0),
    currency          char(3) not null default 'USD',
    occurred_at       timestamptz not null default now(),
    category_id       uuid references categories(id) on delete set null,
    payment_method_id uuid references payment_methods(id) on delete set null,
    merchant          text,
    note              text,
    source            text not null default 'manual'
                       check (source in ('manual','ocr','loan','import')),
    income_origin     text,
    is_fixed_expense  boolean not null default false,
    tax_status        text not null default 'por_definir'
                       check (tax_status in ('definido','por_definir')),
    receipt_image_url text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists idx_tx_user_date on transactions (user_id, occurred_at desc);

create table if not exists transaction_tags (
    transaction_id uuid references transactions(id) on delete cascade,
    tag_id         uuid references tags(id) on delete cascade,
    primary key (transaction_id, tag_id)
);

create table if not exists transaction_items (
    id               uuid primary key default gen_random_uuid(),
    transaction_id   uuid not null references transactions(id) on delete cascade,
    description      text not null,
    quantity         numeric(10,2) default 1,
    unit_price_cents bigint
);

create table if not exists transaction_adjustments (
    id             uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references transactions(id) on delete cascade,
    kind           text not null check (kind in ('tax','surcharge','discount')),
    tax_type_id    uuid references tax_types(id),
    promotion_id   uuid references promotions(id),
    label          text not null,
    rate           numeric(6,4),
    amount_cents   bigint not null check (amount_cents >= 0)
);
create index if not exists idx_adj_tx on transaction_adjustments (transaction_id);

-- ---------- GASTOS FIJOS ----------
create table if not exists fixed_expenses (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name         text not null,
    amount_cents bigint not null,
    category_id  uuid references categories(id),
    due_day      smallint check (due_day between 1 and 31),
    recurrence   text not null default 'monthly'
                 check (recurrence in ('monthly','weekly','yearly')),
    active       boolean not null default true
);

create table if not exists fixed_expense_payments (
    id               uuid primary key default gen_random_uuid(),
    fixed_expense_id uuid not null references fixed_expenses(id) on delete cascade,
    period           date not null,
    due_date         date not null,
    status           text not null default 'unpaid'
                     check (status in ('paid','unpaid','overdue')),
    transaction_id   uuid references transactions(id) on delete set null,
    paid_at          timestamptz,
    unique (fixed_expense_id, period)
);

-- ---------- INGRESOS PASIVOS ----------
create table if not exists passive_incomes (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name                    text not null,
    amount_cents            bigint not null,
    classification          text not null check (classification in
                             ('fijo','recurrente','ocasional','pendiente')),
    schedule                text,
    payment_method_id       uuid references payment_methods(id),
    expected_date           date,
    prudence_days           int,
    warning_days            int,
    status                  text default 'expected'
                             check (status in ('expected','at_risk','received','lost')),
    received_transaction_id uuid references transactions(id) on delete set null,
    created_at              timestamptz not null default now()
);

-- ---------- PRESUPUESTOS ----------
create table if not exists budgets (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name        text,
    scope       text not null check (scope in ('global','category','tag')),
    category_id uuid references categories(id),
    tag_id      uuid references tags(id),
    limit_cents bigint not null,
    period      text not null default 'monthly' check (period in ('weekly','monthly')),
    active      boolean not null default true
);

-- ---------- PLANES DE AHORRO ----------
create table if not exists savings_plans (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name                 text not null,
    target_cents         bigint,
    analysis_months      smallint not null default 3 check (analysis_months in (3,6,9)),
    monthly_target_cents bigint,
    target_date          date,
    created_at           timestamptz not null default now()
);

-- ---------- NOTIFICACIONES ----------
create table if not exists notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
    kind       text not null,
    title      text not null,
    body       text,
    payload    jsonb,
    read_at    timestamptz,
    created_at timestamptz not null default now()
);

-- ============================================================
-- VALIDACIÓN DE CUADRE: subtotal + impuestos + recargos − descuentos = total
-- ============================================================
create or replace function check_transaction_balance(tx uuid)
returns void language plpgsql as $$
declare sub bigint; tot bigint; adj bigint;
begin
    select subtotal_cents, amount_cents into sub, tot
      from transactions where id = tx;
    if sub is null then return; end if;

    select coalesce(sum(
        case kind when 'discount' then -amount_cents else amount_cents end), 0)
      into adj
      from transaction_adjustments where transaction_id = tx;

    if sub + adj <> tot then
        raise exception
          'Desglose no cuadra: subtotal(%) + ajustes(%) <> total(%)', sub, adj, tot;
    end if;
end $$;

-- Trigger sobre ajustes (constraint trigger diferido para validar al commit).
create or replace function trg_check_balance_adj()
returns trigger language plpgsql as $$
begin
    perform check_transaction_balance(coalesce(new.transaction_id, old.transaction_id));
    return null;
end $$;

drop trigger if exists adj_balance_check on transaction_adjustments;
create constraint trigger adj_balance_check
    after insert or update or delete on transaction_adjustments
    deferrable initially deferred
    for each row execute function trg_check_balance_adj();

-- ============================================================
-- VISTAS
-- ============================================================
create or replace view v_user_balance as
select user_id,
       sum(case when type='income'  then amount_cents else 0 end) -
       sum(case when type='expense' then amount_cents else 0 end) as balance_cents
from transactions group by user_id;

create or replace view v_discount_benefits as
select t.user_id,
       c.name as category,
       extract(dow from t.occurred_at)::int as day_of_week,
       a.label as promo,
       count(*) as veces,
       sum(a.amount_cents) as ahorro_total_cents
from transaction_adjustments a
join transactions t on t.id = a.transaction_id
left join categories c on c.id = t.category_id
where a.kind = 'discount'
group by 1,2,3,4;

create or replace view v_tax_coverage as
select user_id,
       count(*) filter (where tax_status='definido')::numeric
         / nullif(count(*),0) as coverage_ratio
from transactions where type='expense'
group by user_id;

-- ============================================================
-- ROW LEVEL SECURITY (un solo usuario, pero estándar de seguridad)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings','categories','tags','payment_methods','tax_types',
    'promotions','transactions',
    'fixed_expenses','passive_incomes','budgets',
    'savings_plans','notifications'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$
      create policy %1$s_owner on %1$I
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
    $p$, t);
  end loop;
end $$;

-- Tablas puente / hijas: política vía la transacción padre.
alter table transaction_tags enable row level security;
create policy transaction_tags_owner on transaction_tags
  using (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()))
  with check (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()));

alter table payment_method_adjustments enable row level security;
create policy pma_owner on payment_method_adjustments
  using (exists (select 1 from payment_methods pm
                 where pm.id = payment_method_id and pm.user_id = auth.uid()))
  with check (exists (select 1 from payment_methods pm
                 where pm.id = payment_method_id and pm.user_id = auth.uid()));

alter table transaction_items enable row level security;
create policy transaction_items_owner on transaction_items
  using (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()))
  with check (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()));

alter table transaction_adjustments enable row level security;
create policy transaction_adjustments_owner on transaction_adjustments
  using (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()))
  with check (exists (select 1 from transactions tx
                 where tx.id = transaction_id and tx.user_id = auth.uid()));

alter table fixed_expense_payments enable row level security;
create policy fep_owner on fixed_expense_payments
  using (exists (select 1 from fixed_expenses fe
                 where fe.id = fixed_expense_id and fe.user_id = auth.uid()))
  with check (exists (select 1 from fixed_expenses fe
                 where fe.id = fixed_expense_id and fe.user_id = auth.uid()));
