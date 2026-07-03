import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

// Campo de monto. Mantiene el texto crudo; la conversión a centavos la hace
// quien lo usa con parseToCents (un solo punto de verdad).
export function MoneyInput({ value, onChangeText, placeholder = '0.00', autoFocus }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.symbol}>$</Text>
      <TextInput
        style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foam,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  symbol: { ...typography.title, color: colors.textSecondary, marginRight: spacing.sm },
  input: { flex: 1, ...typography.title, color: colors.textPrimary, height: '100%' },
});
