# AppBalance ☕ — Control de gastos y planes de ahorro

App para registrar consumos e ingresos, controlar gastos fijos, analizar impuestos y generar planes de ahorro a partir del historial real del usuario. Construida con React Native + Expo y **distribuida como PWA** (Expo web) — se instala en el iPhone desde Safari con "Añadir a pantalla de inicio", sin tiendas.

## Decisiones tomadas

- **Tecnología y distribución (cambio 2 jul 2026):** React Native + Expo compilado a **PWA** (target web de Expo, React Native Web), servida en **Vercel**. Razón: la app es personal para 2 personas (Kevin y su novia, iOS); una PWA evita el Apple Developer Program (USD 99/año), la revisión de tiendas y los builds EAS. Se instala desde Safari → Compartir → "Añadir a pantalla de inicio". La ruta nativa (EAS + App Store) queda descartada mientras el uso siga siendo privado. *Consecuencia:* sin push del SO (se usan avisos in-app), y los datos viven en Supabase (no depender del almacenamiento local que iOS puede purgar).
- **App personal de un solo usuario:** login solo como medio de protección; no hay interacción entre usuarios. `user_id` se mantiene solo en tablas raíz para RLS de Supabase.
- **OCR de facturas:** fuera del MVP. La v1 usa registro manual; el OCR llega en fase 5 con backend.
- **Base de datos:** PostgreSQL vía Supabase (tier gratuito, RLS, storage de facturas).
- **Ajustes de precio:** impuestos y recargos (suman) y descuentos/promos (restan) sobre un subtotal. Cada consumo debe **cuadrar** (`subtotal + impuestos + recargos − descuentos = total`); si no, se **bloquea** guardar. IVA con tasa global editable en Ajustes. Objetivo: analizar beneficios y sugerir qué días comprar qué.

## Documentos

| Archivo | Contenido |
|---|---|
| `01_BASE_DE_DATOS.md` | Esquema Postgres completo (DDL, vistas, RLS, notas de impuestos). |
| `02_ARQUITECTURA.md` | Stack, paleta café, módulos, estructura de carpetas, cálculos clave. |
| `03_PLAN_DESARROLLO.md` | Roadmap por fases (0 a 5) con MVP y criterios de éxito. |
| `04_PLAN_IMPLEMENTACION.md` | Distribución PWA (Expo web + Vercel), instalación en iOS, service worker, avisos, OCR, costos. |

## Cobertura de requisitos

Inicio con saldo en cabecera, últimos consumos y gastos fijos por estado (pagado/no pagado/atrasado); dashboard de métricas; registro manual y por factura (fase 5) con ítems, etiquetas y desglose de impuestos/recargos/descuentos con cuadre obligatorio; estado "por definir" cuando no se marcan ajustes; préstamos vía etiqueta de origen; ingresos rápidos y pasivos (fijo/recurrente/ocasional/pendiente con tiempos de prudencia y advertencia); planificación de ahorro con ventana 3/6/9 meses; gráfico con selectores de eje y slider de días; alertas de presupuesto; módulo de impuestos con aviso de cobertura; promociones por día/categoría con análisis de beneficios y sugerencia de qué días comprar qué; gastos fijos saldados con un consumo seleccionado; medios de pago con recargos prellenados.
