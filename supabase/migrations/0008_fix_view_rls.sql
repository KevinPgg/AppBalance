-- ============================================================
-- AppBalance — 0008: aislar por usuario las vistas legacy
-- ------------------------------------------------------------
-- PROBLEMA: v_user_balance, v_discount_benefits y v_tax_coverage
-- se crearon en 0001 SIN `security_invoker`. Una vista de Postgres
-- corre por defecto con los privilegios de su DUEÑO (postgres), que
-- ES dueño de las tablas y por tanto SALTA la RLS. Resultado: cada
-- usuario ve/agrega los datos de TODOS los usuarios a través de esas
-- vistas. En v_user_balance eso mezcla el saldo de ambos usuarios
-- (y con 2+ usuarios, maybeSingle() del cliente incluso falla porque
-- la vista devuelve más de una fila).
--
-- FIX: recrear las tres vistas con (security_invoker = on) para que
-- respeten la RLS del usuario que consulta, igual que ya hacen
-- v_fixed_expense_current (0004) y v_budget_status (0005).
--
-- No se cambia el esquema de tablas: user_id + RLS por auth.uid()
-- ya existen y ya aíslan las tablas base. Esto cierra la fuga que
-- quedaba únicamente a nivel de vistas.
-- Pega este archivo en Supabase: SQL Editor -> New query -> Run.
-- ============================================================

-- ---------- SALDO ACTUAL (cabecera) ----------
-- Con security_invoker + RLS, `from transactions` sólo ve las filas
-- del usuario actual. El agregado sin GROUP BY garantiza SIEMPRE una
-- sola fila (saldo 0 si no hay transacciones), lo que evita el error
-- de maybeSingle() en el cliente.
drop view if exists v_user_balance;
create view v_user_balance
with (security_invoker = on) as
select auth.uid() as user_id,
       coalesce(sum(case when type = 'income'  then amount_cents else 0 end), 0) -
       coalesce(sum(case when type = 'expense' then amount_cents else 0 end), 0)
         as balance_cents
from transactions;

-- ---------- BENEFICIOS POR DESCUENTO / DÍA / CATEGORÍA ----------
drop view if exists v_discount_benefits;
create view v_discount_benefits
with (security_invoker = on) as
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
group by 1, 2, 3, 4;

-- ---------- COBERTURA DEL ANÁLISIS DE IMPUESTOS ----------
drop view if exists v_tax_coverage;
create view v_tax_coverage
with (security_invoker = on) as
select user_id,
       count(*) filter (where tax_status = 'definido')::numeric
         / nullif(count(*), 0) as coverage_ratio
from transactions
where type = 'expense'
group by user_id;
