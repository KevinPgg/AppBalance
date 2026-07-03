import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { BudgetRow } from '@/features/budgets/BudgetRow';
import { useBudgetsStatus } from '@/features/budgets/useBudgets';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

export default function BudgetsScreen() {
  const router = useRouter();
  const budgets = useBudgetsStatus();
  const items = budgets.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Presupuestos</Text>
        <View style={{ width: 64 }} />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(i) => i.budget_id}
        renderItem={({ item }) => (
          <Card style={styles.rowCard}>
            <BudgetRow item={item} onPress={() => router.push(`/budgets/${item.budget_id}` as any)} />
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>
              {budgets.isLoading
                ? 'Cargando…'
                : 'Aún no tienes presupuestos. Define un límite (por categoría, etiqueta o total) y la app te avisará antes de que te pases.'}
            </Text>
          </Card>
        }
      />

      <View style={styles.footer}>
        <Pressable style={styles.addBtn} onPress={() => router.push('/budgets/new' as any)}>
          <Text style={styles.addText}>＋ Nuevo presupuesto</Text>
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
