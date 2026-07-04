import { View, Text, StyleSheet, Pressable } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { formatMoney } from '@/lib/money';
import type { BudgetStatus } from '@/features/budgets/useBudgets';

export function budgetLabel(b: BudgetStatus): string {
  if (b.name) return b.name;
  if (b.scope === 'category') return b.category_name ?? 'Categoría';
  if (b.scope === 'tag') return b.tag_name ?? 'Etiqueta';
  return 'Gasto total';
}

// Color de la barra según el nivel de uso (recibe el tema activo).
function barColor(t: Theme, ratio: number): string {
  if (ratio >= 1) return t.danger;
  if (ratio >= 0.8) return t.warning;
  return t.success;
}

type Props = {
  item: BudgetStatus;
  onPress?: () => void;
};

export function BudgetRow({ item, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ratio = item.limit_cents > 0 ? item.spent_cents / item.limit_cents : 0;
  const pct = Math.round(ratio * 100);
  const color = barColor(theme, ratio);
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
        <Text style={[styles.remaining, remaining < 0 && { color: theme.danger }]}>
          {remaining < 0
            ? `${formatMoney(-remaining)} de más`
            : `${formatMoney(remaining)} libre`}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: { paddingVertical: spacing.md, gap: spacing.xs },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { ...typography.body, color: t.textPrimary, fontWeight: '600', flex: 1 },
    pct: { ...typography.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
    track: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: t.foamToken,
      overflow: 'hidden',
    },
    fill: { height: 8, borderRadius: radius.pill },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    spent: { ...typography.caption, color: t.textSecondary, fontVariant: ['tabular-nums'] },
    remaining: { ...typography.caption, color: t.textSecondary, fontVariant: ['tabular-nums'] },
  });
