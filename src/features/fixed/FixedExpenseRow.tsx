import { View, Text, Image, StyleSheet, Pressable, Alert } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { formatMoney } from '@/lib/money';
import { categoryIconUri } from '@/features/catalog/categoryIcons';
import {
  type FixedExpenseCurrent,
  type FixedStatus,
  usePayFixedExpense,
  useUnpayFixedExpense,
} from '@/features/fixed/useFixedExpenses';

function statusMeta(
  t: Theme,
  status: FixedStatus,
): { label: string; color: string; bg: string } {
  switch (status) {
    case 'paid':
      return { label: 'Pagado', color: t.success, bg: 'rgba(107,143,113,0.15)' };
    case 'overdue':
      return { label: 'Atrasado', color: t.danger, bg: 'rgba(161,75,60,0.15)' };
    default:
      return { label: 'Pendiente', color: t.warning, bg: 'rgba(201,138,75,0.15)' };
  }
}

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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pay = usePayFixedExpense();
  const unpay = useUnpayFixedExpense();
  const meta = statusMeta(theme, item.status);
  const busy = pay.isPending || unpay.isPending;
  const iconUri = categoryIconUri(item.category_icon);

  function onPay() {
    Alert.alert(
      'Pagar gasto fijo',
      `Se registrará un consumo de ${formatMoney(item.amount_cents)} por "${item.name}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: () =>
            pay
              .mutateAsync({ fixedExpenseId: item.fixed_expense_id })
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
        {iconUri ? (
          <Image source={{ uri: iconUri }} style={styles.iconImg} />
        ) : (
          <Text style={styles.icon}>{item.category_icon ?? '•'}</Text>
        )}
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
              disabled={busy}
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    icon: { fontSize: 20, width: 24, textAlign: 'center' },
    iconImg: { width: 24, height: 24, resizeMode: 'contain' },
    name: { ...typography.body, color: t.textPrimary, fontWeight: '600' },
    sub: { ...typography.caption, color: t.textSecondary, marginTop: 2 },
    right: { alignItems: 'flex-end', gap: spacing.xs },
    amount: { ...typography.body, color: t.textPrimary, fontVariant: ['tabular-nums'] },
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
      backgroundColor: t.coffee,
    },
    payText: { ...typography.caption, color: t.textOnDark, fontWeight: '700' },
    undo: { ...typography.caption, color: t.textSecondary, textDecorationLine: 'underline' },
  });
