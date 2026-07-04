# Plan de Desarrollo — AppBalance ☕

Enfoque: entregar valor en cada fase. **No construyas todo antes de probar nada.** El saldo + registro manual + gastos fijos ya es una app usable.

---

## Fase 0 — Cimientos (semana 1)

- Inicializar Expo + TypeScript + Expo Router.
- Configurar Supabase: proyecto, tablas (SQL de `01_BASE_DE_DATOS.md`), RLS por `user_id`.
- Auth básica (email / magic link de Supabase).
- Tema y design system: paleta café, tipografías, componentes base (`Card`, `BalanceHeader`, `Button`, `CupIcon`).

**Resultado:** app que arranca, login y pantalla vacía con saldo en 0.

---

## Fase 1 — MVP usable (semanas 2–4)

Prioridad máxima. Es lo que hace la app realmente útil.

1. ✅ **Registrar consumo manual**: subtotal, categoría, fecha, nota, etiquetas, medio de pago.
2. ✅ **Desglose de ajustes con cuadre**: al elegir medio de pago, prellenar recargos típicos y preguntar impuestos/descuentos; **validar `subtotal + impuestos + recargos − descuentos = total`** en app y en BD; si no marca nada → "por definir".
3. ✅ **Registrar ingreso rápido** `+$n` con procedencia editable.
4. ✅ **Inicio**: cabecera de saldo + lista de últimos consumos.
5. ✅ **Editar / eliminar** transacciones (misma validación) — *Fase 1.5*.
6. ✅ **Etiquetas personalizadas** (crear, asignar) + **marcar préstamos** (`source='loan'`) — *Fase 1.5*.
7. ✅ **Ajustes base**: tasa global de IVA editable y CRUD de medios de pago — *Fase 1.5*.

**Criterio de éxito:** registras una semana de gastos con sus impuestos/descuentos, el saldo cuadra y ningún consumo se guarda con desglose inconsistente.

---

## Fase 1.5 — Pulido del MVP (30 jun 2026) ✅

Cierre de los pendientes de Fase 1 más ajustes de UX pedidos tras usar la app.

1. ✅ **Indicador de cuadre retirado de la UI**: el total se deriva de `subtotal + ajustes`, así que cuadra por construcción; el trigger de BD sigue como red de seguridad. Ya no se muestra "el desglose cuadra/no cuadra".
2. ✅ **Captura simple vs detallada** (switch en el formulario de consumo):
   - *Simple*: solo monto final + categoría. Guarda `subtotal = total`, sin ajustes y `tax_status='definido'` (sin impuestos). No se expone "por definir" en la lista de Inicio.
   - *Detallado*: pantalla completa (medio, fecha, impuestos, recargos/descuentos, etiquetas, préstamo, comercio, nota).
3. ✅ **Editar / eliminar consumos**: pantalla `transaction/[id]`, filas de Inicio navegables. Edición vía RPC `update_full_transaction` (reescribe ajustes + etiquetas en una sola transacción → un solo chequeo de cuadre al commit). Borrado con cascada.
4. ✅ **Etiquetas personalizadas**: crear/eliminar en Ajustes, asignación multi-selección en el formulario. RPCs `create_/update_full_transaction` aceptan `p_tag_ids`.
5. ✅ **Marcar préstamo**: switch que fija `transactions.source='loan'` (decisión: por `source`, no por etiqueta).
6. ✅ **Ajustes funcional**: editar tasa de IVA (RPC `set_iva_rate`, sincroniza el `tax_type` 'IVA') y CRUD de medios de pago.

**Migración:** `supabase/migrations/0003_edit_tags_settings.sql` (correr en el SQL Editor de Supabase).

7. ✅ **Edición de ingresos** (30 jun 2026): `IncomeForm` reutilizable (crear/editar), pantalla `income/[id]`. `transaction/[id]` redirige los ingresos a su formulario; ya no queda "llegará pronto".

---

## Fase 2 — Estructura financiera (semanas 5–7)

1. ✅ **Gastos fijos** (30 jun 2026): definir/editar/eliminar, generar el período del mes (`ensure_fixed_expense_periods`), saldar con un consumo (`pay_fixed_expense`) y deshacer (`unpay_fixed_expense`), estados pagado / pendiente / atrasado. Vista `v_fixed_expense_current`. Migración `0004_fixed_expenses.sql`.
2. ✅ **Tarjeta de gastos fijos en Inicio** (30 jun 2026): `FixedExpensesCard` con total pendiente del mes, botón Pagar y atajo a la pantalla completa (`app/fixed`).
3. ✅ **Presupuestos** por global / categoría / etiqueta (30 jun 2026): CRUD, vista `v_budget_status` (gasto del período semanal/mensual según alcance), `BudgetForm`, pantalla `app/budgets` y `BudgetsCard` en Inicio con barra de uso. Migración `0005_budgets_notifications.sql`.
4. ✅ **Notificaciones** (30 jun 2026): banner/alerta **dentro de la app** (tabla `notifications`), no push del SO. RPC `refresh_notifications` genera avisos con dedup por período: presupuesto superado, gasto fijo atrasado y por vencer (≤3 días). `AlertsBanner` en Inicio (descartar = marcar leído). Kinds: `budget_exceeded`, `fixed_overdue`, `fixed_due`.

**Criterio de éxito:** ✅ la app avisa antes de que el usuario se pase del presupuesto.

> Solo se generan períodos para gastos fijos con `recurrence='monthly'`. Semanal/anual quedan para después (el formulario fija mensual por ahora).
> Los avisos se recalculan al abrir Inicio (no hay cron en el servidor): `useNotifications`/`useFixedExpensesCurrent` llaman a sus RPC al montar.

**Fase 2 completa.**

---

## Fase 2.5 — Distribución PWA + arreglos web (2 jul 2026) ✅

Decisión de distribuir como **PWA** en lugar de app nativa (ver `00_README.md` y `04_PLAN_IMPLEMENTACION.md`). Se adaptó la app al target web y se corrigieron bugs que solo aparecían en web.

1. ✅ **Andamiaje PWA**: se añadió `react-native-web`, `public/manifest.json`, service worker (`public/sw.js`, *network-first* que **nunca cachea Supabase**), `app/+html.tsx` (manifest + meta de Apple + registro del SW), íconos y `vercel.json` (build `expo export -p web`, output `dist`, rewrites SPA).
2. ✅ **Fix `Alert.alert` en web**: `Alert.alert` con botones no se muestra en React Native Web, así que **no se podía eliminar** consumos, ingresos, gastos fijos ni presupuestos. Nuevo helper `src/lib/confirm.ts` (`confirmAsync`/`notify`) que usa `window.confirm/alert` en web y `Alert` en nativo. Aplicado a los 4 formularios.
3. ✅ **Fix SQL `fe.id is ambiguous`**: la variable record `fe` chocaba con el alias de tabla `fe` en `ensure_fixed_expense_periods` → Gastos Fijos no cargaba. Migración `0006_fix_fe_ambiguous.sql` (alias renombrado a `fx`).
4. ✅ **Categorías con iconos PNG**: nuevos defaults (Transporte, Comida, Entretenimiento, Luz, Agua) con iconos en `public/iconos-categoria`; migración `0007_categorias_iconos.sql` (nuevo `seed_user_defaults` + backfill a usuarios existentes). Hooks `useCreateCategory`/`useDeleteCategory`, gestión (alta/baja) en Ajustes.
5. ✅ **Selector de categoría en grilla 30%** (`CategoryPicker`): alto fijo (~30% de pantalla), iconos tamaño emoji, tiles que llenan columnas y luego scroll horizontal.
6. ✅ **UX**: quitado el "rectángulo negro" (outline de foco) del `MoneyInput` en web; botón **Eliminar siempre al fondo** en formularios de edición (`marginTop: 'auto'` + `flexGrow`); componente `UnderConstruction` (gif de fondo, sin audio) para secciones en desarrollo.
7. ✅ **Reconstrucción de `app/(tabs)/settings.tsx`**: el archivo estaba truncado y sin respaldo (no hay git); se rehízo con IVA, categorías, medios de pago, etiquetas y cerrar sesión al final.

**Migraciones a correr en Supabase:** `0006_fix_fe_ambiguous.sql` y `0007_categorias_iconos.sql`.

**Criterio de éxito:** la app corre en Safari iOS instalada como PWA, se puede eliminar registros, Gastos Fijos carga y las categorías se gestionan desde Ajustes.

**Pendiente:** validar el `expo export -p web` en Windows y el deploy a Vercel; tiles del `CategoryPicker` ajustables si se quiere más densidad.

---

## Fase 2.6 — Correcciones: Pagar gasto fijo + legibilidad modo oscuro (4 jul 2026) ✅

Dos bugs reportados tras usar la app en temas oscuros.

1. ✅ **El botón "Pagar" de gastos fijos no siempre creaba el consumo.** Causa: `pay_fixed_expense(p_payment_id)` exige que ya exista la fila de período (`fixed_expense_payments`), pero esa fila solo la genera `ensure_fixed_expense_periods()` para `recurrence='monthly'`. Para gastos semanales/anuales —o antes de que se genere el período— `payment_id` llegaba `NULL` a la vista, el botón quedaba deshabilitado (`disabled={!item.payment_id}`) y no pasaba nada.
   - **Fix (BD):** nueva RPC `pay_fixed_expense_current(p_fixed_expense_id, …)` que garantiza el período del mes en curso (lo crea si falta, para cualquier recurrencia) y luego salda reutilizando `pay_fixed_expense`. Migración `0009_pay_fixed_by_id.sql`.
   - **Fix (app):** `usePayFixedExpense` ahora recibe `fixedExpenseId` (siempre disponible) en vez de `paymentId`; `FixedExpenseRow` llama con `item.fixed_expense_id` y se quitó el `disabled` por `payment_id` nulo. "Deshacer" sigue usando `payment_id` (solo aparece cuando ya existe).

2. ✅ **Modo oscuro (Espresso y Dark Cherry): ~70% del texto no se leía.** La causa NO eran las paletas —los tokens dark de `themes.ts` son idénticos a `Estilo_design/theme.css` y tienen buen contraste—, sino un error de migración: ~28 textos usaban `color: t.espresso` / `color: t.coffee` como color de **letra**. Esos alias apuntan a los colores de **fondo** de marca (`espresso`/`espresso2`), que en claro son marrones legibles pero en oscuro son casi negros (`#0F0B08`, `#2A1F17`, `#5C1228`) → letra casi negra sobre fondo casi negro (títulos, encabezados, "Atrás", "Ver todos", valores de resumen, tab activo, links).
   - **Fix:** `color: t.espresso` → `color: t.textPrimary` (token `ink`, que sí invierte a claro en oscuro, tal como el diseño usa `--ink` para títulos); `color: t.coffee` → `color: t.caramel` (accent legible en ambos modos, como `.link`/`.btn--ghost` en el CSS). Solo se tocaron usos de **texto**; los `backgroundColor`/`borderColor`/`shadowColor` de `espresso`/`coffee` (pills activos, botones, FAB) quedan intactos.

**Migración a correr en Supabase:** `0009_pay_fixed_by_id.sql`.

**Verificación:** 0 ocurrencias restantes de `color: t.espresso|coffee` en `src`/`app`; chips/segmentos activos usan `textOnDark` (claro) sobre fondo oscuro → legibles.

> **[Probable]** Si tras esto queda algún elemento puntual ilegible en oscuro, es un `color:` hardcodeado o un token mal asignado en ese componente específico; hace falta una captura de la app corriendo para ubicarlo. La distinción visual de los pills activos en oscuro (fondo `coffee` ≈ `surface`) es un pulido aparte, no un problema de legibilidad de texto.

---

## Fase 3 — Análisis (semanas 8–10)

1. **Dashboard** con métricas (total mes, por categoría, por medio de pago, tendencia, ticket promedio).
2. **Gráfico de consumos** con selectores de agrupación (categoría / tienda / etiqueta) y slider de rango de días.
3. **Módulo de impuestos** con indicador de cobertura y advertencia de datos incompletos.
4. **Promociones y análisis de beneficios**: catálogo de promos por día/categoría, cuánto ahorraste por mes y **sugerencia de qué días comprar qué categoría** (`v_discount_benefits`).

**Criterio de éxito:** el usuario entiende en qué se va su dinero y recibe al menos una sugerencia útil de ahorro por día.

---

## Fase 4 — Inteligencia financiera (semanas 11–13)

1. **Ingresos pasivos** con clasificación (fijo / recurrente / ocasional / pendiente) y tiempos de prudencia y advertencia.
2. **Alertas de ingresos pendientes en riesgo**.
3. **Planificación de ahorro** con ventana histórica de 3 / 6 / 9 meses → meta mensual realista.

**Criterio de éxito:** la app propone un plan de ahorro basado en datos reales del usuario.

---

## Fase 5 — OCR de facturas (semanas 14–16, opcional)

- Backend ligero de OCR (ver `04_PLAN_IMPLEMENTACION.md`).
- Captura de foto → extracción de monto, comercio, ítems e impuestos → prellenado del formulario de consumo (siempre editable antes de guardar).

**Por qué al final:** es la feature de mayor costo/tiempo y menor necesidad para que la app funcione. El registro manual ya cubre el caso.

---

## Prioridades transversales (en cada fase)

- **Datos correctos > features.** Si el saldo o un total está mal, nada más importa. Tests sobre `money.ts` y los cálculos de saldo/presupuesto.
- **Offline-friendly:** TanStack Query con cache; el usuario registra gastos aunque no haya red.
- **Accesibilidad y tamaños táctiles** (usuarios reales tocan con el pulgar en la calle).

## Riesgos a vigilar

- **[Probable]** El OCR de facturas de baja calidad dará resultados imperfectos; preséntalo siempre como borrador editable, nunca como dato final.
- **[Seguro]** Impuestos: el análisis es tan bueno como los datos ingresados. Comunícalo en la UI desde el inicio para no generar falsa confianza.
- **[Seguro]** Al ser PWA, iOS **no da push del SO** salvo Web Push con la PWA instalada (iOS 16.4+). Los avisos son in-app; no prometas notificaciones fuera de la app.
- **[Seguro]** iOS puede **purgar el almacenamiento local** de la PWA si no se abre en ~7 días. La fuente de verdad debe ser Supabase, nunca `localStorage`/`IndexedDB`.
