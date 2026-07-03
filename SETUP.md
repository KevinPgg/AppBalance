# Arranque — AppBalance ☕ (Fase 0)

Andamiaje listo: app Expo + Expo Router + Supabase + tema café + login + saldo. Estos pasos los corres **tú** en tu máquina (dependen de tu cuenta de Supabase).

## Requisitos

- Node 18+ y npm.
- App **Expo Go** en tu iPhone/Android (para probar sin compilar).
- Cuenta gratuita en [supabase.com](https://supabase.com).

## 1. Instalar dependencias

```bash
cd AppBalance
npm install
# alinea las versiones nativas con tu versión de Expo:
npx expo install
```

## 2. Crear el proyecto Supabase

1. En supabase.com → **New project** (elige región cercana).
2. Cuando esté listo: **SQL Editor → New query**, pega todo `supabase/migrations/0001_init.sql` y **Run**.
3. **Authentication → Providers → Email**: déjalo activado y **apaga "Confirm email"** (login por email + contraseña, sin links de confirmación).
4. **Project Settings → API**: copia `Project URL` y `anon public key`.

## 3. Configurar variables

```bash
cp .env.example .env
```

Edita `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 4. Correr la app

```bash
npx expo start
```

Escanea el QR con Expo Go. En el login, la primera vez toca "Crear cuenta", pon email + contraseña y entras directo (con "Confirm email" apagado). La pantalla de Inicio muestra el saldo en 0 y "sin consumos" (aún no hay registro de consumos — eso es Fase 1).

## Qué hay y qué no (Fase 0)

Incluido: login por email, cabecera de saldo (vista `v_user_balance`), lista de últimos consumos, navegación por tabs (Inicio, Métricas, Beneficios, Ajustes), tema café, helpers de dinero y la función `checkBalance` de cuadre de ajustes. El esquema completo con RLS y el trigger de validación ya están en la migración.

No incluido todavía (Fase 1+): registrar/editar consumos e ingresos, desglose de impuestos/descuentos en la UI, gastos fijos, presupuestos, gráficos, ahorro. El plan está en `docs/03_PLAN_DESARROLLO.md`.

## Verificación rápida

```bash
npx tsc --noEmit   # chequeo de tipos
```

Para probar el cuadre antes de tener UI, inserta una transacción y sus ajustes en el SQL Editor: si `subtotal + impuestos + recargos − descuentos ≠ total`, el `INSERT` se rechaza (trigger `adj_balance_check`).

## Estructura

```
app/                 # pantallas (Expo Router)
  (auth)/login.tsx
  (tabs)/            # Inicio, Métricas, Beneficios, Ajustes
src/
  components/        # Card, Button, BalanceHeader, TxRow
  features/          # transactions, adjustments (cuadre)
  lib/               # supabase, money, queryClient
  store/             # auth (zustand)
  theme/             # colors (paleta café), typography
supabase/migrations/ # 0001_init.sql
docs/                # planes y diseño
```
