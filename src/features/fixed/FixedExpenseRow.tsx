import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import { formatMoney } from '@/lib/money';
import {
  type FixedExpenseCurrent,
  type FixedStatus,
  usePayFixedExpense,
  useUnpayFixedExpense,
} from '@/features/fixed/useFixedExpenses';

const STATUS_META: Record<FixedStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'Pagado', color: colors.success, bg: 'rgba(107,143,113,0.15)' },
  unpaid: { label: 'Pendiente', color: colors.warning, bg: 'rgba(201,138,75,0.15)' },
  overdue: { label: 'Atrasado', color: colors.danger, bg: 'rgba(161,75,60,0.15)' },
};

function dueLabel(item: FixedExpenseCurrent): string {
  if (item.status === 'paid') return 'Saldado este mes';
  if (!item.due_date) return 'Sin fecha de cobro';
  const d = new Date(item.due_date + 'T00:00:00');
  return `Vence el ${d.getDate()}`;
}

type Props = {
  item: FixedExpenseCurrent;
  onPress?: () => void;
};

export function FixedExpenseRow({ item, onPress }: Props) {
  const pay = usePayFixedExpense();
  const unpay = useUnpayFixedExpense();
  const meta = STATUS_META[item.status];
  const busy = pay.isPending || unpay.isPending;

  function onPay() {
    if (!item.payment_id) return;
    Alert.alert(
      'Pagar gasto fijo',
      `Se registrará un consumo de ${formatMoney(item.amount_cents)} por "${item.name}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: () =>
            pay
              .mutateAsync({ paymentId: item.payment_id! })
              .catch((e: any) =>
                Alert.alert('No se pudo pagar', e?.message ?? 'Error desconocido'),
              ),
        },
      ],
    );
  }

  function onUndo() {
    if (!item.payment_id) return;
    Alert.alert(
      'Deshacer pago',
      'Se elimina el consumo enlazado y el gasto vuelve a pendiente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deshacer',
          style: 'destructive',
          onPress: () =>
            unpay
              .mutateAsync(item.payment_id!)
              .catch((e: any) =>
                Alert.alert('No se pudo deshacer', e?.message ?? 'Error desconocido'),
              ),
        },
      ],
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.icon}>{item.category_icon ?? '•'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.sub}>{dueLabel(item)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formatMoney(item.amount_cents)}</Text>
        <View style={styles.actionRow}>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.status === 'paid' ? (
            <Pressable onPress={onUndo} hitSlop={8} disabled={busy}>
              <Text style={styles.undo}>Deshacer</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onPay}
              hitSlop={8}
              disabled={busy || !item.payment_id}
              style={styles.payBtn}
            >
              <Text style={styles.payText}>{pay.isPending ? '…' : 'Pagar'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  icon: { fontSize: 20 },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  amount: { ...typography.body, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, fontWeight: '600' },
  payBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.coffee,
  },
  payText: { ...typography.caption, color: colors.textOnDark, fontWeight: '700' },
  undo: { ...typography.caption, color: colors.textSecondary, textDecorationLine: 'underline' },
});
