import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BalanceHeader } from '@/components/BalanceHeader';
import { Card } from '@/components/Card';
import { TxRow } from '@/components/TxRow';
import { FixedExpensesCard } from '@/features/fixed/FixedExpensesCard';
import { BudgetsCard } from '@/features/budgets/BudgetsCard';
import { AlertsBanner } from '@/features/notifications/AlertsBanner';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import { useBalance, useRecentTransactions } from '@/features/transactions/useTransactions';

export default function HomeScreen() {
  const router = useRouter();
  const balance = useBalance();
  const txs = useRecentTransactions();

  return (
    <View style={styles.container}>
      <BalanceHeader balanceCents={balance.data ?? 0} loading={balance.isLoading} />

      <View style={styles.actions}>
        <Pressable
          style={[styles.action, styles.actionPrimary]}
          onPress={() => router.push('/transaction/new')}
        >
          <Text style={styles.actionPrimaryText}>＋ Registrar consumo</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.actionSecondary]}
          onPress={() => router.push('/income/new')}
        >
          <Text style={styles.actionSecondaryText}>＋ Ingreso</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={txs.data ?? []}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <>
            <AlertsBanner />
            <FixedExpensesCard />
            <BudgetsCard />
            <Text style={styles.section}>Últimos consumos</Text>
          </>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/transaction/${item.id}`)}>
            <TxRow tx={item} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>
              {txs.isLoading
                ? 'Cargando…'
                : 'Aún no hay consumos. Registra el primero para empezar a ver tu saldo en movimiento.'}
            </Text>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  action: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionPrimary: { flex: 2, backgroundColor: colors.coffee },
  actionPrimaryText: { ...typography.subtitle, color: colors.textOnDark },
  actionSecondary: {
    flex: 1,
    backgroundColor: colors.foam,
    borderWidth: 1,
    borderColor: colors.coffee,
  },
  actionSecondaryText: { ...typography.subtitle, color: colors.coffee },
  list: { padding: spacing.xl, gap: spacing.xs },
  section: { ...typography.subtitle, color: colors.espresso, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary },
});
