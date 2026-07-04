import { useMemo } from 'react';
import { useTheme } from '@/store/theme';
import type { Theme } from '@/theme/themes';

// Memoiza los estilos derivados del tema activo. Uso:
//   const makeStyles = (t: Theme) => StyleSheet.create({ ... });
//   const styles = useThemedStyles(makeStyles);
// Recalcula solo cuando cambia el tema.
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
