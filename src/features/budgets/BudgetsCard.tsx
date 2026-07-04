import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { BudgetRow } from '@/features/budgets/BudgetRow';
import { useBudgetsStatus } from '@/features/budgets/useBudgets';
import { spacing, typography } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

const PREVIEW = 3;

// Tarjeta de presupuestos para Inicio: muestra el uso del período actual,
// priorizando los que van más ajustados. Vacío → invita a crear el primero.
export function BudgetsCard() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const budgets = useBudgetsStatus();
  const items = budgets.data ?? [];

  if (budgets.isLoading) return null;

  if (items.length === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Presupuestos</Text>
          <Pressable onPress={() => router.push('/budgets' as any)} hitSlop={8}>
            <Text style={styles.link}>Agregar</Text>
          </Pressable>
        </View>
        <Text style={styles.empty}>
          Define un límite por categoría, etiqueta o total y te avisaremos antes de pasarte.
        </Text>
      </Card>
    );
  }

  // Ordena por uso descendente (los más ajustados primero).
  const ordered = [...items].sort((a, b) => {
    const ra = a.limit_cents > 0 ? a.spent_cents / a.limit_cents : 0;
    const rb = b.limit_cents > 0 ? b.spent_cents / b.limit_cents : 0;
    return rb - ra;
  });
  const preview = ordered.slice(0, PREVIEW);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Presupuestos</Text>
        <Pressable onPress={() => router.push('/budgets' as any)} hitSlop={8}>
          <Text style={styles.link}>Ver todos</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {preview.map((item, i) => (
        <View key={item.budget_id}>
          {i > 0 && <View style={styles.rowDivider} />}
          <BudgetRow item={item} onPress={() => router.push(`/budgets/${item.budget_id}` as any)} />
        </View>
      ))}

      {items.length > PREVIEW && (
        <Pressable onPress={() => router.push('/budgets' as any)} style={styles.moreBtn}>
          <Text style={styles.moreText}>Ver {items.length - PREVIEW} más</Text>
        </Pressable>
      )}
    </Card>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: { marginBottom: spacing.lg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { ...typography.subtitle, color: t.textPrimary },
    link: { ...typography.body, color: t.caramel, fontWeight: '600' },
    empty: { ...typography.body, color: t.textSecondary, marginTop: spacing.sm },
    divider: { height: 1, backgroundColor: t.border, marginTop: spacing.md },
    rowDivider: { height: 1, backgroundColor: t.border },
    moreBtn: { paddingTop: spacing.md, alignItems: 'center' },
    moreText: { ...typography.caption, color: t.caramel, fontWeight: '600' },
  });