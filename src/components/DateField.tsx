import { createElement } from 'react';
import { Platform, TextInput, StyleSheet } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme, useThemeStore } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { todayStr } from '@/lib/dates';

type Props = {
  value: string; // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  max?: string; // por defecto hoy: no se permite fecha futura
};

// Selector de fecha. En web (la PWA) renderiza un <input type="date"> real, que
// abre el calendario nativo del sistema (ideal en Safari iOS) sin dependencias.
// En nativo cae a captura manual AAAA-MM-DD (la app se distribuye como PWA; el
// nativo es por completitud).
export function DateField({ value, onChange, max = todayStr() }: Props) {
  const theme = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'date',
      value,
      max,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        backgroundColor: theme.foam,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 16,
        height: 50,
        color: theme.textPrimary,
        fontSize: 16,
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        // Hace que el ícono del calendario y el popup nativo combinen con el tema.
        colorScheme: mode === 'dark' ? 'dark' : 'light',
      },
    });
  }

  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder="AAAA-MM-DD"
      placeholderTextColor={theme.textSecondary}
      keyboardType="numbers-and-punctuation"
    />
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    input: {
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      height: 50,
      ...typography.body,
      color: t.textPrimary,
    },
  });
