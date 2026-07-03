# Esquema de Base de Datos — AppBalance ☕

Motor: **PostgreSQL** vía **Supabase** (login de un solo usuario, respaldo en la nube).

## Principios de diseño

1. **App personal de un solo usuario.** No hay interacción entre usuarios. Se mantiene `user_id` **solo en las tablas raíz** para que el login de Supabase (RLS por `auth.uid()`) aísle tus datos; las tablas hijas heredan el alcance por su tabla padre. No se reparte `user_id` por todos lados.
2. **Una sola tabla `transactions`** unifica consumos (gasto) e ingresos con un campo `type`.
3. **El saldo NO se almacena**: se calcula como `SUM(ingresos) - SUM(gastos)`. Vista `v_user_balance`.
4. **Etiquetas personalizadas** = `tags` + `transaction_tags` (N:M).
5. Montos en **enteros (centavos)**: `amount_cents BIGINT`.
6. **Ajustes de precio (clave de esta versión).** Impuestos, recargos y descuentos se modelan como *ajustes* sobre un subtotal. Cada consumo debe **cuadrar**: `subtotal + impuestos + recargos − descuentos = total`. Si no cuadra, **se bloquea** la creación/edición.

---

## Modelo de ajustes (impuestos, recargos, descuentos)

Tres conceptos, una misma mecánica:

- **Impuesto** (suma): IVA, etc. IVA tiene tasa global editable en ajustes.
- **Recargo** (suma): servicio de app de delivery, propina de viaje, comisión de medio de pago.
- **Descuento** (resta): "promo martes", "miércoles de bebés" (personalizables), por día y/o categoría/tienda.

El catálogo de impuestos/recargos es editable. Las promociones (descuentos) son una tabla aparte porque llevan **día de la semana** y **categoría/tienda**, que alimentan el análisis de beneficios ("qué días conviene comprar qué").

---

## Diagrama (resumen)

```
users
 ├─ app_settings (iva_rate, currency)
 ├─< transactions >─┬─ categories
 │                  ├─ payment_methods ─< payment_method_adjustments ── tax_types
 │                  ├─< transaction_tags >── tags
 │                  ├─< transaction_items
 │                  └─< transaction_adjustments ──┬─ tax_types
 │                                                └─ promotions
 ├─< tax_types          (catálogo de impuestos/recargos)
 ├─< promotions         (descuentos por día / categoría)
 ├─< fixed_expenses ─< fixed_expense_payments ── (transaction)
 ├─< passive_incomes
 ├─< savings_plans
 ├─< budgets
 └─< notifications
```

---

## DDL (SQL)

```sql
-- ============ USUARIO (uno solo) + AJUSTES GLOBALES ============
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- = auth.uid()
    email           TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_settings (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    iva_rate        NUMERIC(6,4) NOT NULL DEFAULT 0.15,  -- IVA editable en menú general
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CATEGORÍAS ============
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    icon        TEXT,
    color       TEXT
);

-- ============ ETIQUETAS PERSONALIZADAS ============
CREATE TABLE tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT,
    UNIQUE (user_id, name)
);

-- ============ MÉTODOS DE PAGO ============
CREATE TABLE payment_methods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN
                 ('indefinido','efectivo','transferencia','debito','credito')),
    label       TEXT
);

-- ============ CATÁLOGO DE IMPUESTOS / RECARGOS ============
-- IVA, servicio de app, comisión, etc. Editable y ampliable.
CREATE TABLE tax_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,            -- 'IVA', 'Servicio de app', 'Propina'
    kind            TEXT NOT NULL CHECK (kind IN ('tax','surcharge')),
    default_rate    NUMERIC(6,4),             -- 0.15 = 15%; NULL si es monto fijo
    active          BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (user_id, name)
);

-- Recargos/impuestos que suelen aplicar a un medio de pago (prellenado).
-- Ej.: un medio "App de delivery" trae servicio de app por defecto.
CREATE TABLE payment_method_adjustments (
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
    tax_type_id       UUID REFERENCES tax_types(id) ON DELETE CASCADE,
    rate              NUMERIC(6,4),           -- override del default_rate, opcional
    PRIMARY KEY (payment_method_id, tax_type_id)
);

-- ============ PROMOCIONES / DESCUENTOS ============
-- 'Promo martes', 'Miércoles de bebés' (personalizada). Alimenta el análisis
-- de beneficios y la sugerencia de qué días comprar qué categoría.
CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    discount_kind   TEXT NOT NULL CHECK (discount_kind IN ('percentage','amount')),
    value           NUMERIC(12,4) NOT NULL,   -- 0.10 (=10%) o monto en centavos
    day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- NULL = cualquier día
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    merchant        TEXT,
    active          BOOLEAN NOT NULL DEFAULT true
);

-- ============ TRANSACCIONES (consumos + ingresos) ============
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL CHECK (type IN ('expense','income')),
    -- desglose: subtotal base e importe final (lo que sale del bolsillo)
    subtotal_cents      BIGINT NOT NULL CHECK (subtotal_cents >= 0),
    amount_cents        BIGINT NOT NULL CHECK (amount_cents >= 0), -- total final
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    occurred_at         TIMESTAMPTZ NOT NULL,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
    payment_method_id   UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    merchant            TEXT,
    note                TEXT,
    source              TEXT NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('manual','ocr','loan','import')),
    income_origin       TEXT,
    is_fixed_expense    BOOLEAN NOT NULL DEFAULT false,
    -- estado del desglose de impuestos/ajustes
    tax_status          TEXT NOT NULL DEFAULT 'por_definir'
                          CHECK (tax_status IN ('definido','por_definir')),
    receipt_image_url   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_user_date ON transactions (user_id, occurred_at DESC);

CREATE TABLE transaction_tags (
    transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id          UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    quantity        NUMERIC(10,2) DEFAULT 1,
    unit_price_cents BIGINT
);

-- ============ AJUSTES APLICADOS A UNA TRANSACCIÓN ============
-- Reemplaza a transaction_taxes. Cubre impuesto, recargo y descuento.
CREATE TABLE transaction_adjustments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL CHECK (kind IN ('tax','surcharge','discount')),
    tax_type_id     UUID REFERENCES tax_types(id),   -- si vino del catálogo
    promotion_id    UUID REFERENCES promotions(id),  -- si vino de una promo
    label           TEXT NOT NULL,                    -- 'IVA 15%', 'Promo martes'
    rate            NUMERIC(6,4),                     -- tasa aplicada (si %)
    -- monto del ajuste, SIEMPRE positivo; el signo lo da 'kind'
    amount_cents    BIGINT NOT NULL CHECK (amount_cents >= 0)
);
CREATE INDEX idx_adj_tx ON transaction_adjustments (transaction_id);

-- ============ GASTOS FIJOS ============
CREATE TABLE fixed_expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    amount_cents    BIGINT NOT NULL,
    category_id     UUID REFERENCES categories(id),
    due_day         SMALLINT CHECK (due_day BETWEEN 1 AND 31),
    recurrence      TEXT NOT NULL DEFAULT 'monthly'
                      CHECK (recurrence IN ('monthly','weekly','yearly')),
    active          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE fixed_expense_payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixed_expense_id    UUID NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
    period              DATE NOT NULL,
    due_date            DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'unpaid'
                          CHECK (status IN ('paid','unpaid','overdue')),
    transaction_id      UUID REFERENCES transactions(id) ON DELETE SET NULL,
    paid_at             TIMESTAMPTZ,
    UNIQUE (fixed_expense_id, period)
);

-- ============ INGRESOS PASIVOS / PENDIENTES ============
CREATE TABLE passive_incomes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    amount_cents        BIGINT NOT NULL,
    classification      TEXT NOT NULL CHECK (classification IN
                          ('fijo','recurrente','ocasional','pendiente')),
    schedule            TEXT,
    payment_method_id   UUID REFERENCES payment_methods(id),
    expected_date       DATE,
    prudence_days       INT,
    warning_days        INT,
    status              TEXT DEFAULT 'expected'
                          CHECK (status IN ('expected','at_risk','received','lost')),
    received_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PRESUPUESTOS ============
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT,
    scope           TEXT NOT NULL CHECK (scope IN ('global','category','tag')),
    category_id     UUID REFERENCES categories(id),
    tag_id          UUID REFERENCES tags(id),
    limit_cents     BIGINT NOT NULL,
    period          TEXT NOT NULL DEFAULT 'monthly'
                      CHECK (period IN ('weekly','monthly')),
    active          BOOLEAN NOT NULL DEFAULT true
);

-- ============ PLANES DE AHORRO ============
CREATE TABLE savings_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    target_cents        BIGINT,
    analysis_months     SMALLINT NOT NULL DEFAULT 3
                          CHECK (analysis_months IN (3,6,9)),
    monthly_target_cents BIGINT,
    target_date         DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ NOTIFICACIONES ============
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    payload         JSONB,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Validación de cuadre (bloquea guardar si el desglose está mal)

Regla obligatoria al crear o editar un consumo:

```
total (amount_cents) = subtotal_cents
                     + Σ ajustes(kind='tax')
                     + Σ ajustes(kind='surcharge')
                     − Σ ajustes(kind='discount')
```

Se valida en **dos capas**:

1. **App (antes de enviar):** se recalcula en vivo; el botón "Guardar" se deshabilita si no cuadra y se muestra la diferencia.
2. **Base de datos (red de seguridad):** función + trigger que rechaza el `INSERT/UPDATE` si no cuadra. Imprescindible porque sin esto el análisis de beneficios sería poco fiable.

```sql
CREATE OR REPLACE FUNCTION check_transaction_balance(tx UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    sub  BIGINT;
    tot  BIGINT;
    adj  BIGINT;
BEGIN
    SELECT subtotal_cents, amount_cents INTO sub, tot
      FROM transactions WHERE id = tx;

    SELECT COALESCE(SUM(
        CASE kind WHEN 'discount' THEN -amount_cents ELSE amount_cents END), 0)
      INTO adj
      FROM transaction_adjustments WHERE transaction_id = tx;

    IF sub + adj <> tot THEN
        RAISE EXCEPTION
          'Desglose no cuadra: subtotal(%) + ajustes(%) <> total(%)', sub, adj, tot;
    END IF;
END $$;

-- Llamar dentro de un trigger AFTER INSERT/UPDATE sobre transaction_adjustments
-- y transactions (deferred), o invocarla desde la Edge Function que guarda el consumo.
```

> **Nota:** como la validación cruza dos tablas (transacción + ajustes), conviene guardar el consumo y sus ajustes en **una sola operación/transacción de BD** (Edge Function o RPC) y llamar a `check_transaction_balance` al final, antes del commit.

---

## "Por definir"

Si al registrar el consumo el usuario **no marca ningún impuesto/ajuste**, el consumo se guarda con `tax_status = 'por_definir'` y `subtotal_cents = amount_cents` (cuadra trivialmente). Estos consumos:

- Aparecen marcados en la UI para completarse después.
- **Quedan fuera del análisis de impuestos y de beneficios** hasta definirse, y bajan el indicador de cobertura.

---

## Vistas útiles

```sql
-- Saldo actual (cabecera de la app)
CREATE VIEW v_user_balance AS
SELECT user_id,
       SUM(CASE WHEN type='income'  THEN amount_cents ELSE 0 END) -
       SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) AS balance_cents
FROM transactions GROUP BY user_id;

-- Beneficios por descuento, categoría y día de la semana
-- (alimenta "qué días conviene comprar qué")
CREATE VIEW v_discount_benefits AS
SELECT t.user_id,
       c.name AS category,
       EXTRACT(DOW FROM t.occurred_at)::INT AS day_of_week,
       a.label AS promo,
       COUNT(*)                  AS veces,
       SUM(a.amount_cents)       AS ahorro_total_cents
FROM transaction_adjustments a
JOIN transactions t ON t.id = a.transaction_id
LEFT JOIN categories c ON c.id = t.category_id
WHERE a.kind = 'discount'
GROUP BY 1,2,3,4;

-- Cobertura del análisis de impuestos (% de consumos con desglose definido)
CREATE VIEW v_tax_coverage AS
SELECT user_id,
       COUNT(*) FILTER (WHERE tax_status='definido')::NUMERIC
         / NULLIF(COUNT(*),0) AS coverage_ratio
FROM transactions WHERE type='expense'
GROUP BY user_id;
```

---

## Análisis de beneficios (objetivo del usuario)

Con `transaction_adjustments` (descuentos) + `promotions` (día/categoría) la app puede, por mes:

- Cuánto ahorraste por promociones y en qué categorías.
- Qué día de la semana rinde más cada categoría (ej. comprar pañales el miércoles).
- Sugerir: "compra la categoría X los Y" cuando hay un patrón de ahorro consistente.

La calidad de estas sugerencias depende de registrar bien el desglose; por eso la validación de cuadre es estricta.

## Row Level Security

Activar **RLS** en todas las tablas con `user_id = auth.uid()`. Aunque sea de un solo usuario, es la forma estándar y segura de proteger tus datos en Supabase.
