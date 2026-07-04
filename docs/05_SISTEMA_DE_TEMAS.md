# Sistema de temas — AppBalance ☕🍒

Rediseño portado desde `Estilo_design/` (artifact HTML de Claude). El diseño original
usa variables CSS (`--token`) + atributos `data-family/data-mode` + `localStorage`.
React Native **no tiene** ninguna de esas tres cosas, así que se reimplementó en JS.

## Idea central

Cuatro temas, dos familias × dos modos:

| Familia | Modo claro | Modo oscuro |
|---|---|---|
| `cafe` | **Latte** | **Espresso** |
| `cherry` | **Cherry** | **Dark Cherry** |

Cada tema es un objeto de tokens en JS. El tema activo se elige en runtime y se
persiste. Cambiar de tema recolorea solo los componentes **ya migrados** a `useTheme()`.

## Piezas

- **`src/theme/themes.ts`** — las 4 paletas con los tokens exactos del `theme.css`
  (`bg`, `surface`, `heroFrom/To`, `caramel`, `pos`, `neg`, `onHero*`…). Cada tema
  expone además **alias** con los mismos nombres del viejo `colors.ts`
  (`espresso`, `coffee`, `foam`, `cream`, `border`, `textPrimary`…) para que migrar
  una pantalla sea casi un reemplazo `colors.` → `theme.` sin renombrar llaves.
  También define `THEME_LABELS` y `FAMILY_SWATCHES` (para el selector en Ajustes).
- **`src/store/theme.ts`** — store Zustand con `family`/`mode`, persistencia en
  AsyncStorage (clave `cl-theme`), e hidratación al arranque. Expone:
  - `useThemeStore` — estado + acciones (`setFamily`, `setMode`, `toggleMode`, `hydrate`).
  - `useTheme()` — devuelve el objeto `Theme` activo (tokens + alias).
  - `useThemeLabel()` — nombre visible del tema activo (ej. `'Dark Cherry'`).
- **`src/theme/useThemedStyles.ts`** — hook `useThemedStyles(makeStyles)` que memoiza
  `makeStyles(theme)`; reduce el boilerplate en cada pantalla migrada.
- **`app/_layout.tsx`** — llama `hydrate()` al arrancar (junto al `init` de auth).
- **`src/theme/colors.ts`** — se deja **intacto**: es la paleta estática (Latte) que
  siguen usando las pantallas aún no migradas. No se borra hasta terminar la migración.

## Cómo migrar una pantalla o componente

Patrón mecánico. Antes:

```tsx
import { colors } from '@/theme/colors';
const styles = StyleSheet.create({ card: { backgroundColor: colors.foam } });
export function X() { return <View style={styles.card} />; }
```

Después:

```tsx
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

const makeStyles = (t: Theme) =>
  StyleSheet.create({ card: { backgroundColor: t.foam } });

export function X() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.card} />;
}
```

Reglas:

1. Mueve el `StyleSheet.create(...)` a una función `makeStyles(t: Theme)` fuera del
   componente y reemplaza cada `colors.X` por `t.X`.
2. Dentro del componente: `const styles = useThemedStyles(makeStyles);`.
3. Colores usados **inline** (props como `placeholderTextColor={colors.textSecondary}`)
   cámbialos a `theme.textSecondary` con `const theme = useTheme();`.
4. Los subcomponentes definidos en el mismo archivo también llaman a `useThemedStyles`
   (son componentes React, pueden usar hooks).

## Tokens nuevos del diseño (para componentes rediseñados)

Además de los alias, hay tokens que el diseño usa y el viejo `colors.ts` no tenía:

- `heroFrom` / `heroTo` — degradado de la card de saldo (usar con `expo-linear-gradient`).
- `onHero`, `onHeroDim`, `onHeroWarm`, `onHeroGreen` — textos sobre el hero.
- `caramel`, `accentDeep` — acento del FAB y degradados.
- `pos`, `neg`, `gold` — montos positivos/negativos y avisos.
- `foamToken` — relleno de tracks/segmentos (más oscuro que `surface`).

> RN no soporta `linear-gradient` en `backgroundColor` ni `color-mix()`. Los degradados
> van con `expo-linear-gradient`; las mezclas (`color-mix(pos 16%)`) se precalculan a rgba.

## Estado transicional (importante)

La migración es **por partes**. Mientras no esté completa:

- Los primitivos compartidos ya migrados (`Card`, `Button`) recolorean en toda la app.
- Una pantalla **no migrada** conserva su fondo/estilos de la paleta estática (Latte).
- Por eso el default es `cafe-light` (Latte ≈ look actual): hasta que el usuario cambie
  de tema, todo se ve igual. Si cambia a Cherry, verá recoloreado solo lo migrado.

Esto es esperado y desaparece al terminar de migrar las pantallas.

## Decisión de mapeo a revisar

El alias `coffee` se mapeó a `espresso2` (marrón oscuro secundario), no a `caramel`,
para que los botones primarios sigan viéndose oscuros como hoy. Si en Home se prefiere
el acento caramelo del diseño, se ajusta en `buildTheme()` (un solo lugar).

## Orden de migración y progreso

- [x] **1. Ajustes** — migrado + selector de paleta (Café/Cherry) y modo (Latte/Espresso)
  funcionando en vivo. También se migraron los primitivos compartidos `Card` y `Button`.
- [x] **2. Home** — `BalanceHeader` rediseñado (hero con degradado vía `expo-linear-gradient`,
  saludo y pills gastado/ingresos del mes con `useMonthSummary`), footer con FAB abanico
  (`CustomTabBar`: speed-dial consumo/ingreso + overlay). Migrados también `TxRow` y el
  `_layout` de tabs.
- [x] **2b. Sub-tarjetas y primitivos de Home/formularios** — `FixedExpensesCard`,
  `BudgetsCard`, `AlertsBanner`, `FixedExpenseRow`, `BudgetRow`, y los primitivos de
  formulario `MoneyInput`, `SelectChips`, `CategoryPicker`. Con esto **Home queda 100%
  temático** y los bloques de los formularios están listos.
- [x] **3. Formularios y pantallas restantes** — completo:
  - [x] `TransactionForm` (consumo) + `IncomeForm` (ingreso) y sus wrappers
    `app/transaction/[id]`, `app/income/[id]`.
  - [x] `FixedExpenseForm`, `BudgetForm` y sus wrappers/listas
    (`app/fixed/index`, `app/fixed/[id]`, `app/budgets/index`, `app/budgets/[id]`).
  - [x] `app/(tabs)/dashboard`, `app/(tabs)/taxes`, `app/(auth)/login`,
    `src/components/UnderConstruction`.
- [x] **4. `colors.ts` retirado** — ningún archivo lo importa
  (`grep -r "@/theme/colors" src app` no devuelve nada). El archivo quedó como **shim
  deprecado** que re-exporta la paleta Latte (no se pudo borrar físico desde el sandbox;
  se puede eliminar del proyecto sin efecto).

> **Migración de temas COMPLETA.** Toda la UI recolorea con Latte / Espresso / Cherry /
> Dark Cherry desde Ajustes → Cuenta. Verificación viva: `grep -rl "@/theme/colors" src app`
> debe seguir sin resultados.

## Modificaciones aplicadas durante la migración

- **Nuevas dependencias:** `expo-linear-gradient` (degradados del hero y del FAB).
  Instalar con `npx expo install expo-linear-gradient` (alinea a SDK 54).
- **Nuevo hook** `useMonthSummary` (`features/transactions/useTransactions.ts`): suma
  gastado/ingresos del mes en curso para las pills del hero.
- **Tab bar custom** `CustomTabBar` reemplaza la barra por defecto (FAB central + speed-dial).
  El overlay usa `useWindowDimensions` (responsive en PWA), no `Dimensions.get()` estático.
- **Funciones con color a nivel de módulo** (que no pueden usar hooks) se convirtieron para
  **recibir `theme`**: `barColor(t, ratio)` en `BudgetRow`, `metaFor(t, kind)` en
  `AlertsBanner`, `statusMeta(t, status)` en `FixedExpenseRow`. Patrón a repetir si aparecen
  más constantes de color fuera de componentes.
- **Pendiente conocido:** `StatusBar` en `app/_layout.tsx` sigue fijo en `style="light"`;
  en temas claros debería ser oscuro. Se ajustará al cerrar la migración.
- **Pendiente conocido:** el FAB abanico aún no anima (aparición directa, `＋`→`✕` estático).
