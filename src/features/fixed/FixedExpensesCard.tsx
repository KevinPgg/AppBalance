import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { FixedExpenseRow } from '@/features/fixed/FixedExpenseRow';
import { useFixedExpensesCurrent } from '@/features/fixed/useFixedExpenses';
import { formatMoney } from '@/lib/money';
import { spacing, typography } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

const PREVIEW = 3;

// Tarjeta de gastos fijos para Inicio: muestra pendientes del mes y atajo
// a la pantalla completa. Si no hay gastos fijos, invita a crear el primero.
export function FixedExpensesCard() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const fixed = useFixedExpensesCurrent();
  const items = fixed.data ?? [];

  const pending = items.filter((i) => i.status !== 'paid');
  const pendingTotal = pending.reduce((s, i) => s + i.amount_cents, 0);

  // Prioriza mostrar pendientes; rellena con pagados si sobra espacio.
  const ordered = [...pending, ...items.filter((i) => i.status === 'paid')];
  const preview = ordered.slice(0, PREVIEW);

  if (fixed.isLoading) return null;

  if (fixed.error) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Gastos fijos</Text>
        <Text style={styles.errorText}>
          No se pudieron cargar. {(fixed.error as any)?.message ?? 'Error desconocido'}
        </Text>
        <Text style={styles.empty}>
          ¿Corriste la migración 0004_fixed_expenses.sql en Supabase?
        </Text>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Gastos fijos</Text>
          <Pressable onPress={() => router.push('/fixed')} hitSlop={8}>
            <Text style={styles.link}>Agregar</Text>
          </Pressable>
        </View>
        <Text style={styles.empty}>
          Registra renta, suscripciones y servicios para que la app te avise antes de cada cobro.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Gastos fijos</Text>
          <Text style={styles.sub}>
            {pending.length === 0
              ? 'Completado'
              : `${formatMoney(pendingTotal)} pendiente · ${pending.length} sin pagar`}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/fixed')} hitSlop={8}>
          <Text style={styles.link}>Ver todos</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {preview.map((item, i) => (
        <View key={item.fixed_expense_id}>
          {i > 0 && <View style={styles.rowDivider} />}
          <FixedExpenseRow
            item={item}
            onPress={() => router.push(`/fixed/${item.fixed_expense_id}`)}
          />
        </View>
      ))}

      {items.length > PREVIEW && (
        <Pressable onPress={() => router.push('/fixed')} style={styles.moreBtn}>
          <Text style={styles.moreText}>
            Ver {items.length - PREVIEW} más
          </Text>
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    title: { ...typography.subtitle, color: t.textPrimary },
    sub: { ...typography.caption, color: t.textSecondary, marginTop: 2 },
    link: { ...typography.body, color: t.caramel, fontWeight: '600' },
    empty: { ...typography.body, color: t.textSecondary, marginTop: spacing.sm },
    errorText: { ...typography.caption, color: t.danger, marginTop: spacing.sm },
    divider: { height: 1, backgroundColor: t.border, marginTop: spacing.md },
    rowDivider: { height: 1, backgroundColor: t.border },
    moreBtn: { paddingTop: spacing.md, alignItems: 'center' },
    moreText: { ...typography.caption, color: t.caramel, fontWeight: '600' },
  });