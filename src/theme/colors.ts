// ⚠️ DEPRECADO — no usar en código nuevo.
// El sistema de temas vive en `src/theme/themes.ts` + `useTheme()`
// (`src/store/theme.ts`). Ya ninguna pantalla importa este archivo.
// Se conserva solo como shim por compatibilidad; puedes borrarlo del
// proyecto cuando quieras (ningún import apunta aquí).
//
// Si algo lo importara por error, devuelve la paleta Latte (cafe-light),
// que era el look por defecto anterior.
import { THEMES } from '@/theme/themes';

/** @deprecated Usa `useTheme()` de `@/store/theme`. */
export const colors = THEMES['cafe-light'];

/** @deprecated */
export type ColorName = keyof typeof colors;
