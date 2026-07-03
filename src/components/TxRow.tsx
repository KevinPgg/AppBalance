import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';
import { formatMoney } from '@/lib/money';

export type Tx = {
  id: string;
  type: 'expense' | 'income';
  amount_cents: number;
  merchant?: string | null;
  category?: string | null;
  occurred_at: string;
  tax_status?: 'definido' | 'por_definir';
};

export function TxRow({ tx }: { tx: Tx }) {
  const isIncome = tx.type === 'income';
  const sign = isIncome ? '+' : '−';
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.merchant || tx.category || (isIncome ? 'Ingreso' : 'Consumo')}
        </Text>
        <Text style={styles.sub}>{new Date(tx.occurred_at).toLocaleDateString('es')}</Text>
      </View>
      <Text style={[styles.amount, { color: isIncome ? colors.success : colors.coffee }]}>
        {sign} {formatMoney(tx.amount_cents).replace(/^[-−]/, '')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flex: 1, marginRight: spacing.md },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  amount: { ...typography.subtitle, fontVariant: ['tabular-nums'] },
});
