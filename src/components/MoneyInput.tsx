import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

// Campo de monto. Mantiene el texto crudo; la conversión a centavos la hace
// quien lo usa con parseToCents (un solo punto de verdad).
export function MoneyInput({ value, onChangeText, placeholder = '0.00', autoFocus }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.symbol}>$</Text>
      <TextInput
        style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus={autoFocus}
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      height: 56,
    },
    symbol: { ...typography.title, color: t.textSecondary, marginRight: spacing.sm },
    input: { flex: 1, ...typography.title, color: t.textPrimary, height: '100%' },
  });
