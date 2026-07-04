import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FixedExpenseForm, type FixedFormInitial } from '@/features/fixed/FixedExpenseForm';
import { useFixedExpense } from '@/features/fixed/useFixedExpenses';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export default function EditFixedExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const fe = useFixedExpense(id);

  if (fe.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.coffee} />
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cream },
    msg: { ...typography.body, color: t.textSecondary, padding: spacing.xl, textAlign: 'center' },
  });
