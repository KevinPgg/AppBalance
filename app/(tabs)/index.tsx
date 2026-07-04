import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BalanceHeader } from '@/components/BalanceHeader';
import { Card } from '@/components/Card';
import { TxRow } from '@/components/TxRow';
import { FixedExpensesCard } from '@/features/fixed/FixedExpensesCard';
import { BudgetsCard } from '@/features/budgets/BudgetsCard';
import { AlertsBanner } from '@/features/notifications/AlertsBanner';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { useAuth } from '@/store/auth';
import {
  useBalance,
  useMonthSummary,
  useRecentTransactions,
} from '@/features/transactions/useTransactions';

export default function HomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const balance = useBalance();
  const summary = useMonthSummary();
  const txs = useRecentTransactions();
  const email = useAuth((s) => s.session?.user?.email ?? null);
  const name = email ? email.split('@')[0] : null;

  return (
    <View style={styles.container}>
      <BalanceHeader
        balanceCents={balance.data ?? 0}
        spentCents={summary.data?.spentCents ?? 0}
        incomeCents={summary.data?.incomeCents ?? 0}
        name={name}
        loading={balance.isLoading}
      />

      <FlatList
        contentContainerStyle={styles.list}
        data={txs.data ?? []}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <AlertsBanner />
            <FixedExpensesCard />
            <BudgetsCard />
            <Text style={styles.section}>Últimos movimientos</Text>
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
                : 'Aún no hay movimientos. Toca el + para registrar el primero.'}
            </Text>
          </Card>
        }
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    list: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.xs },
    section: {
      ...typography.subtitle,
      fontWeight: '700',
      color: t.textPrimary,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    empty: { ...typography.body, color: t.textSecondary },
  });
