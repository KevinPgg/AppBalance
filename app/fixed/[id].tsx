import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FixedExpenseForm, type FixedFormInitial } from '@/features/fixed/FixedExpenseForm';
import { useFixedExpense } from '@/features/fixed/useFixedExpenses';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';

export default function EditFixedExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fe = useFixedExpense(id);

  if (fe.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.coffee} />
      </SafeAreaView>
    );
  }

  if (fe.error || !fe.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>No se pudo cargar el gasto fijo.</Text>
      </SafeAreaView>
    );
  }

  const initial: FixedFormInitial = {
    id: fe.data.id,
    name: fe.data.name,
    amountCents: fe.data.amount_cents,
    categoryId: fe.data.category_id,
    dueDay: fe.data.due_day,
  };

  return <FixedExpenseForm mode="edit" initial={initial} onDone={() => router.back()} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  msg: { ...typography.body, color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' },
});
