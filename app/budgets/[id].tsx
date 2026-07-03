import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BudgetForm, type BudgetFormInitial } from '@/features/budgets/BudgetForm';
import { useBudget } from '@/features/budgets/useBudgets';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';

export default function EditBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const budget = useBudget(id);

  if (budget.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.coffee} />
      </SafeAreaView>
    );
  }

  if (budget.error || !budget.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>No se pudo cargar el presupuesto.</Text>
      </SafeAreaView>
    );
  }

  const initial: BudgetFormInitial = {
    id: budget.data.id,
    name: budget.data.name,
    scope: budget.data.scope,
    categoryId: budget.data.category_id,
    tagId: budget.data.tag_id,
    limitCents: budget.data.limit_cents,
    period: budget.data.period,
  };

  return <BudgetForm mode="edit" initial={initial} onDone={() => router.back()} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  msg: { ...typography.body, color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' },
});
