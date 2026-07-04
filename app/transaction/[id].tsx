import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { TransactionForm, type TxFormInitial } from '@/features/transactions/TransactionForm';
import { useTransaction } from '@/features/transactions/useTransactions';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export default function EditTransactionScreen() {
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
        <Text style={styles.msg}>No se pudo cargar el consumo.</Text>
      </SafeAreaView>
    );
  }

  // Los ingresos se editan en su propio formulario.
  if (tx.data.type === 'income') {
    return <Redirect href={`/income/${tx.data.id}`} />;
  }

  const initial: TxFormInitial = {
    id: tx.data.id,
    occurredAt: tx.data.occurred_at,
    subtotalCents: tx.data.subtotal_cents,
    amountCents: tx.data.amount_cents,
    categoryId: tx.data.category_id,
    paymentMethodId: tx.data.payment_method_id,
    merchant: tx.data.merchant,
    note: tx.data.note,
    taxStatus: tx.data.tax_status,
    source: tx.data.source,
    adjustments: tx.data.adjustments.map((a) => ({
      kind: a.kind,
      label: a.label,
      amount_cents: a.amount_cents,
    })),
    tagIds: tx.data.tag_ids,
  };

  return <TransactionForm mode="edit" initial={initial} onDone={() => router.back()} />;
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cream },
    msg: { ...typography.body, color: t.textSecondary, padding: spacing.xl, textAlign: 'center' },
  });
