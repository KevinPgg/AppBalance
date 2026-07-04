import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { IncomeForm, type IncomeFormInitial } from '@/features/transactions/IncomeForm';
import { useTransaction } from '@/features/transactions/useTransactions';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export default function EditIncomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useTransaction(id);

  if (tx.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.coffee} />
      </SafeAreaView>
    );
  }

  if (tx.error || !tx.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>No se pudo cargar el ingreso.</Text>
      </SafeAreaView>
    );
  }

  // Si en realidad es un consumo, lo manda al formulario de consumos.
  if (tx.data.type === 'expense') {
    return <Redirect href={`/transaction/${tx.data.id}`} />;
  }

  const initial: IncomeFormInitial = {
    id: tx.data.id,
    occurredAt: tx.data.occurred_at,
    amountCents: tx.data.amount_cents,
    paymentMethodId: tx.data.payment_method_id,
    incomeOrigin: tx.data.income_origin,
    source: tx.data.source,
  };

  return <IncomeForm mode="edit" initial={initial} onDone={() => router.back()} />;
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cream },
    msg: { ...typography.body, color: t.textSecondary, padding: spacing.xl, textAlign: 'center' },
  });
