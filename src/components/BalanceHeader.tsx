import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';
import { formatMoney } from '@/lib/money';

type Props = {
  balanceCents: number;
  currency?: string;
  loading?: boolean;
};

// Cabecera fija con el saldo actual. Siempre visible en Inicio.
export function BalanceHeader({ balanceCents, currency = 'USD', loading }: Props) {
  const insets = useSafeAreaInsets();
  const negative = balanceCents < 0;
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.label}>Saldo actual ☕</Text>
      <Text style={[styles.amount, negative && styles.amountNegative]}>
        {loading ? '—' : formatMoney(balanceCents, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.espresso,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  label: { ...typography.caption, color: colors.latte, marginBottom: spacing.xs },
  amount: { ...typography.display, color: colors.textOnDark, fontVariant: ['tabular-nums'] },
  amountNegative: { color: colors.warning },
});
