# Arquitectura y Módulos — AppBalance ☕

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| App | **React Native + Expo (SDK 54)** compilado a **PWA** (React Native Web) | Una sola base de código; se sirve como web instalable en iOS (Safari → "Añadir a inicio"). Requiere `react-native-web` + `react-dom`. |
| Lenguaje | **TypeScript** | Tipado fuerte para datos financieros. |
| Navegación | **Expo Router** (file-based) | Rutas por archivos, igual que Next.js. |
| Estado servidor | **TanStack Query** | Cache, sincronización y reintentos automáticos. |
| Estado local | **Zustand** | Ligero, sin boilerplate. |
| Backend / DB | **Supabase** (Postgres + Auth + Storage) | App personal de **un solo usuario**: login solo como protección, RLS por `auth.uid()`, respaldo en la nube y storage de facturas. |
| Gráficos | **victory-native** o **react-native-gifted-charts** | Gráficos nativos fluidos. |
| Notificaciones | **Avisos in-app** (tabla `notifications`) | Sin push del SO en PWA iOS. Web Push es posible más adelante solo si se instala la PWA (iOS 16.4+). |
| Cámara | **expo-image-picker** / input file web | Captura de facturas (para OCR, fase 5). |
| Build / deploy | **`expo export -p web` → Vercel** | Sitio estático (SPA). Sin Mac, sin EAS, sin tiendas. |
| PWA | **manifest.json + service worker + `app/+html.tsx`** | Instalable en iOS; el SW nunca cachea Supabase (evita datos financieros viejos). |

> OCR: **fuera del MVP** (decidido). Cuando se incluya, va en un backend ligero (ver `04_PLAN_IMPLEMENTACION.md`), nunca en el dispositivo.

---

## Paleta de colores (de la imagen de referencia)

Estética: café, tarde de trabajo chill. Modo claro cálido por defecto.

| Token | Hex | Uso |
|---|---|---|
| `espresso` | `#3B2A24` | Texto principal, fondos oscuros, cabecera de saldo |
| `coffee` | `#5E3B30` | Acentos fuertes, botones primarios |
| `mocha` | `#9B6A50` | Acento secundario, iconos, barras de gráfico |
| `latte` | `#C9A57E` | Resaltados, estados activos |
| `sage` | `#A9A491` | Bordes suaves, texto secundario, fondos de tarjeta |
| `cream` | `#EFE7DC` | Fondo de pantalla |
| `foam` | `#FBF7F1` | Fondo de tarjetas / superficies |
| `success` | `#6B8F71` | Pagado / dentro de presupuesto |
| `warning` | `#C98A4B` | En riesgo / atrasado leve |
| `danger`  | `#A14B3C` | Sobre presupuesto / vencido |

Detalle de marca: iconografía de tacitas, vapor y granos; tarjetas con esquinas redondeadas (16px) y sombra suave; tipografía serif para títulos (ej. *Fraunces*) y sans para datos (ej. *Inter*).

```ts
// theme/colors.ts
export const colors = {
  espresso: '#3B2A24', coffee: '#5E3B30', mocha: '#9B6A50',
  latte: '#C9A57E', sage: '#A9A491', cream: '#EFE7DC',
  foam: '#FBF7F1', success: '#6B8F71', warning: '#C98A4B', danger: '#A14B3C',
};
```

---

## Módulos de la app

1. **Inicio (Home)**
   - Cabecera fija con **saldo actual** (de `v_user_balance`), siempre visible.
   - Lista de **últimos consumos**.
   - Tarjeta de **gastos fijos del mes**: estado pagado / no pagado / atrasado.
   - Accesos rápidos a "Registrar consumo" e "Ingreso".

2. **Dashboard (métricas)**
   - Consumo total del mes, por categoría, por tipo, por medio de pago.
   - Tendencia temporal, ticket promedio, comparativo mes anterior.

3. **Registro de consumo**
   - Manual (MVP) con subtotal, categoría, ítems, etiquetas y medio de pago.
   - Al elegir el **medio de pago** se prellenan los recargos/impuestos típicos de ese medio (ej. servicio de app en delivery) y se preguntan los **ajustes**: IVA, servicio, descuentos/promos.
   - **Desglose con cuadre obligatorio:** `subtotal + impuestos + recargos − descuentos = total`. Si no cuadra, el botón Guardar se bloquea (validado también en BD).
   - Si no se marca ningún ajuste → consumo queda como **"por definir"**.
   - Registro de **préstamos** vía etiqueta de origen.
   - Foto de factura → OCR (fase 5).
   - Edición de consumos existentes (misma validación de cuadre).

4. **Ingresos**
   - Ingreso rápido `+$n`, procedencia editable.
   - **Ingresos pasivos**: clasificación fijo / recurrente / ocasional / pendiente, con tiempos de prudencia y advertencia para préstamos por cobrar.

5. **Gráfico de consumos**
   - Eje Y = gasto (valor); selector de agrupación por categoría / tienda / etiqueta.
   - Eje X = tiempo; slider para rango de días.

6. **Planificación de ahorro**
   - Selector de ventana histórica (3 / 6 / 9 meses).
   - Genera meta mensual realista a partir del gasto/ingreso histórico.

7. **Impuestos, descuentos y beneficios**
   - Análisis sobre consumos con desglose definido; indicador de **cobertura** y advertencia de datos incompletos.
   - **Catálogo editable** de impuestos/recargos; **IVA con tasa global** editable en Ajustes.
   - **Promociones/descuentos** (ej. "promo martes", "miércoles de bebés") por día y categoría/tienda.
   - **Análisis de beneficios:** cuánto ahorraste por promos, en qué categorías, y **sugerencia de qué días conviene comprar qué** (vista `v_discount_benefits`).

8. **Gastos fijos**
   - Definir gastos fijos; saldar cada período seleccionando un consumo existente.

9. **Presupuestos y alertas**
   - Límites por global / categoría / etiqueta; notificaciones al superarlos.

---

## Estructura de carpetas

```
app/                        # Expo Router (pantallas)
  (tabs)/
    index.tsx               # Inicio
    dashboard.tsx
    chart.tsx
    savings.tsx
    taxes.tsx
  transaction/
    new.tsx
    [id].tsx                # editar
  income/new.tsx
  fixed/index.tsx
  _layout.tsx
src/
  components/               # UI reutilizable (Card, BalanceHeader, TxRow, CupIcon)
  features/                 # lógica por módulo
    transactions/
    adjustments/            # impuestos, recargos, descuentos + validación de cuadre
    income/
    fixed-expenses/
    savings/
    taxes/                  # análisis de impuestos y beneficios/promos
    budgets/
    settings/               # IVA global, catálogo de impuestos, promociones
  lib/
    supabase.ts             # cliente + tipos generados
    money.ts                # helpers de centavos/formato
    queries/                # hooks de TanStack Query
  store/                    # Zustand (UI state)
  theme/
    colors.ts
    typography.ts
assets/                     # iconos de tacitas, fuentes
supabase/
  migrations/               # el SQL de 01_BASE_DE_DATOS.md
```

---

## Cálculos clave (en el cliente o como vistas SQL)

- **Saldo**: `SUM(income) - SUM(expense)` → vista `v_user_balance`.
- **Estado de gasto fijo**: si hoy > `due_date` y `status='unpaid'` → `overdue`; si existe `transaction_id` → `paid`.
- **Ingreso pendiente en riesgo**: si `today > expected_date + warning_days` → marcar `at_risk` y emitir notificación.
- **Plan de ahorro**: `ingreso_promedio(N) - gasto_promedio(N)` sobre la ventana elegida = capacidad de ahorro mensual sugerida.
- **Cuadre de consumo (validación bloqueante)**: `subtotal + impuestos + recargos − descuentos = total`. Se valida en la app (deshabilita Guardar) y en BD (`check_transaction_balance`).
- **Sugerencia de días de compra**: patrón consistente de ahorro por categoría + día de la semana en `v_discount_benefits`.
