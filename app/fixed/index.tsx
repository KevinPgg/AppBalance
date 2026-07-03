import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { FixedExpenseRow } from '@/features/fixed/FixedExpenseRow';
import { useFixedExpensesCurrent } from '@/features/fixed/useFixedExpenses';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

export default function FixedExpensesScreen() {
  const router = useRouter();
  const fixed = useFixedExpensesCurrent();
  const items = fixed.data ?? [];

  const pending = items.filter((i) => i.status !== 'paid');
  const pendingTotal = pending.reduce((s, i) => s + i.amount_cents, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Gastos fijos</Text>
        <View style={{ width: 64 }} />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(i) => i.fixed_expense_id}
        ListHeaderComponent={
          items.length > 0 ? (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pendiente este mes</Text>
              <Text style={styles.summaryValue}>{formatMoney(pendingTotal)}</Text>
              <Text style={styles.summarySub}>
                {pending.length === 0
                  ? 'Todo saldado 🎉'
                  : `${pending.length} de ${items.length} sin pagar`}
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.rowCard}>
            <FixedExpenseRow
              item={item}
              onPress={() => router.push(`/fixed/${item.fixed_expense_id}`)}
            />
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            {fixed.error ? (
              <Text style={styles.empty}>
                No se pudieron cargar los gastos fijos. {(fixed.error as any)?.message ?? ''}
                {'\n\n'}¿Corriste la migración 0004_fixed_expenses.sql en Supabase?
              </Text>
            ) : (
              <Text style={styles.empty}>
                {fixed.isLoading
                  ? 'Cargando…'
                  : 'Aún no tienes gastos fijos. Agrega la renta, suscripciones o servicios para no perderles el rastro.'}
              </Text>
            )}
          </Card>
        }
      />

      <View style={styles.footer}>
        <Pressable style={styles.addBtn} onPress={() => router.push('/fixed/new')}>
          <Text style={styles.addText}>＋ Nuevo gasto fijo</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { ...typography.body, color: colors.coffee, width: 64 },
  title: { ...typography.subtitle, color: colors.espresso },
  list: { padding: spacing.xl, gap: spacing.sm },
  summaryCard: { marginBottom: spacing.sm },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { ...typography.display, color: colors.espresso, marginTop: spacing.xs },
  summarySub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  rowCard: { paddingVertical: spacing.xs },
  empty: { ...typography.body, color: colors.textSecondary },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
  addBtn: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.coffee,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { ...typography.subtitle, color: colors.textOnDark },
});
