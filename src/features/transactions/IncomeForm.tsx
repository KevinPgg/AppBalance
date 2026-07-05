import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MoneyInput } from '@/components/MoneyInput';
import { SelectChips } from '@/components/SelectChips';
import { DateField } from '@/components/DateField';
import { toDateStr, todayStr, daysAgoStr, dateStrToISO } from '@/lib/dates';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { centsToText, parseToCents } from '@/lib/money';
import { confirmAsync, notify } from '@/lib/confirm';
import { usePaymentMethods } from '@/features/catalog/useCatalog';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/features/transactions/useCreateTransaction';

const DAY_OPTIONS = [
  { id: '0', label: 'Hoy' },
  { id: '1', label: 'Ayer' },
  { id: '2', label: 'Hace 2 d' },
  { id: '3', label: 'Hace 3 d' },
];

const ORIGIN_SUGGESTIONS = ['Sueldo', 'Venta', 'Préstamo', 'Reembolso', 'Regalo'];

export type IncomeFormInitial = {
  id: string;
  occurredAt: string;
  amountCents: number;
  paymentMethodId: string | null;
  incomeOrigin: string | null;
  source: string;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: IncomeFormInitial;
  onDone: () => void;
};

export function IncomeForm({ mode, initial, onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const paymentMethods = usePaymentMethods();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const [amountText, setAmountText] = useState(
    initial ? centsToText(initial.amountCents) : '',
  );
  const [origin, setOrigin] = useState(initial?.incomeOrigin ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(
    initial?.paymentMethodId ?? null,
  );
  const [dateStr, setDateStr] = useState<string>(
    initial ? toDateStr(initial.occurredAt) : todayStr(),
  );

  const amountCents = parseToCents(amountText);
  const isBusy = createTx.isPending || updateTx.isPending;
  const canSave = amountCents > 0 && !isBusy;

  const paymentOptions =
    paymentMethods.data?.map((p) => ({ id: p.id, label: p.label ?? p.kind })) ?? [];

  async function onSave() {
    if (amountCents <= 0) {
      notify('Falta el monto', 'Escribe cuánto ingresó.');
      return;
    }
    try {
      if (mode === 'edit' && initial) {
        await updateTx.mutateAsync({
          id: initial.id,
          type: 'income',
          subtotalCents: amountCents,
          amountCents,
          occurredAt: dateStrToISO(dateStr),
          paymentMethodId,
          incomeOrigin: origin.trim() || null,
          taxStatus: 'definido',
          source: (initial.source as 'manual' | 'loan') ?? 'manual',
        });
      } else {
        await createTx.mutateAsync({
          type: 'income',
          subtotalCents: amountCents,
          amountCents,
          occurredAt: dateStrToISO(dateStr),
          paymentMethodId,
          incomeOrigin: origin.trim() || null,
          taxStatus: 'definido',
        });
      }
      onDone();
    } catch (e: any) {
      notify('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirmAsync('Eliminar ingreso', '¿Seguro? Esto no se puede deshacer.');
    if (!ok) return;
    try {
      await deleteTx.mutateAsync(initial.id);
      onDone();
    } catch (e: any) {
      notify('No se pudo eliminar', e?.message ?? 'Error desconocido');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onDone} hitSlop={12}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Editar ingreso' : 'Nuevo ingreso'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Monto</Text>
          <MoneyInput value={amountText} onChangeText={setAmountText} />

          <Text style={styles.label}>Procedencia</Text>
          <TextInput
            style={styles.input}
            value={origin}
            onChangeText={setOrigin}
            placeholder="¿De dónde viene?"
            placeholderTextColor={theme.textSecondary}
          />
          <View style={styles.suggestRow}>
            {ORIGIN_SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => setOrigin(s)} style={styles.suggest}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Medio</Text>
          <SelectChips
            options={paymentOptions}
            selectedId={paymentMethodId}
            onSelect={setPaymentMethodId}
          />

          <Text style={styles.label}>Fecha</Text>
          <SelectChips
            options={DAY_OPTIONS}
            selectedId={DAY_OPTIONS.find((o) => daysAgoStr(Number(o.id)) === dateStr)?.id ?? null}
            onSelect={(id) => setDateStr(daysAgoStr(Number(id)))}
          />
          <View style={styles.dateFieldWrap}>
            <DateField value={dateStr} onChange={setDateStr} />
          </View>

          {mode === 'edit' && (
            <Pressable onPress={onDelete} style={styles.deleteBtn} disabled={deleteTx.isPending}>
              <Text style={styles.deleteText}>
                {deleteTx.isPending ? 'Eliminando…' : 'Eliminar ingreso'}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={
              isBusy ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar ingreso'
            }
            onPress={onSave}
            loading={isBusy}
            disabled={!canSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    headerTitle: { ...typography.subtitle, color: t.textPrimary },
    cancel: { ...typography.body, color: t.caramel, width: 64 },
    body: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xs, flexGrow: 1 },
    label: {
      ...typography.caption,
      color: t.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      height: 50,
      ...typography.body,
      color: t.textPrimary,
    },
    dateFieldWrap: { marginTop: spacing.sm },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    suggest: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
    },
    suggestText: { ...typography.caption, color: t.caramel },
    deleteBtn: {
      marginTop: 'auto',
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.danger,
    },
    deleteText: { ...typography.subtitle, color: t.danger },
    footer: {
      padding: spacing.xl,
      borderTopWidth: 1,
      borderTopColor: t.border,
      backgroundColor: t.cream,
    },
  });
