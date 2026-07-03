import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import { formatMoney } from '@/lib/money';
import type { BudgetStatus } from '@/features/budgets/useBudgets';

export function budgetLabel(b: BudgetStatus): string {
  if (b.name) return b.name;
  if (b.scope === 'category') return b.category_name ?? 'Categoría';
  if (b.scope === 'tag') return b.tag_name ?? 'Etiqueta';
  return 'Gasto total';
}

function barColor(ratio: number): string {
  if (ratio >= 1) return colors.danger;
  if (ratio >= 0.8) return colors.warning;
  return colors.success;
}

type Props = {
  item: BudgetStatus;
  onPress?: () => void;
};

export function BudgetRow({ item, onPress }: Props) {
  const ratio = item.limit_cents > 0 ? item.spent_cents / item.limit_cents : 0;
  const pct = Math.round(ratio * 100);
  const color = barColor(ratio);
  const remaining = item.limit_cents - item.spent_cents;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {budgetLabel(item)}
        </Text>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.spent}>
          {formatMoney(item.spent_cents)} de {formatMoney(item.limit_cents)}
        </Text>
        <Text style={[styles.remaining, remaining < 0 && { color: colors.danger }]}>
          {remaining < 0
            ? `${formatMoney(-remaining)} de más`
            : `${formatMoney(remaining)} libre`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.md, gap: spacing.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  pct: { ...typography.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: radius.pill },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  spent: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  remaining: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
});
