import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MoneyInput } from '@/components/MoneyInput';
import { SelectChips } from '@/components/SelectChips';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DateField } from '@/components/DateField';
import { toDateStr, todayStr, daysAgoStr, dateStrToISO } from '@/lib/dates';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { centsToText, formatMoney, parseToCents } from '@/lib/money';
import { confirmAsync, notify } from '@/lib/confirm';
import {
  useCategories,
  usePaymentMethods,
  useTaxTypes,
  useAppSettings,
} from '@/features/catalog/useCatalog';
import { useTags } from '@/features/catalog/useTags';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type AdjustmentInput,
} from '@/features/transactions/useCreateTransaction';
import { adjustmentsNet } from '@/features/adjustments/balance';

type TaxMode = 'iva' | 'none' | 'pending';
type ExtraKind = 'surcharge' | 'discount';
type ExtraRow = { id: string; kind: ExtraKind; label: string; amountText: string };

let rowSeq = 0;
const newRow = (kind: ExtraKind): ExtraRow => ({
  id: `r${rowSeq++}`,
  kind,
  label: kind === 'surcharge' ? 'Recargo' : 'Descuento',
  amountText: '',
});

const DAY_OPTIONS = [
  { id: '0', label: 'Hoy' },
  { id: '1', label: 'Ayer' },
  { id: '2', label: 'Hace 2 d' },
  { id: '3', label: 'Hace 3 d' },
];

export type TxFormInitial = {
  id: string;
  occurredAt: string;
  subtotalCents: number;
  amountCents: number;
  categoryId: string | null;
  paymentMethodId: string | null;
  merchant: string | null;
  note: string | null;
  taxStatus: 'definido' | 'por_definir';
  source: string;
  adjustments: { kind: 'tax' | 'surcharge' | 'discount'; label: string; amount_cents: number }[];
  tagIds: string[];
};

type Props = {
  mode: 'create' | 'edit';
  initial?: TxFormInitial;
  onDone: () => void;
};

export function TransactionForm({ mode, initial, onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();
  const taxTypes = useTaxTypes();
  const settings = useAppSettings();
  const tags = useTags();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  // Reconstruye el estado del formulario desde una transacción existente.
  const initialExtras: ExtraRow[] =
    initial?.adjustments
      .filter((a) => a.kind !== 'tax')
      .map((a) => ({
        id: `r${rowSeq++}`,
        kind: a.kind as ExtraKind,
        label: a.label,
        amountText: centsToText(a.amount_cents),
      })) ?? [];
  const initialTaxMode: TaxMode = initial
    ? initial.adjustments.some((a) => a.kind === 'tax')
      ? 'iva'
      : initial.taxStatus === 'por_definir'
        ? 'pending'
        : 'none'
    : 'pending';

  // Modo de captura: detallado si la transacción ya tiene desglose.
  const startsDetailed =
    mode === 'edit' &&
    !!initial &&
    (initial.adjustments.length > 0 || initial.amountCents !== initial.subtotalCents);
  const [entryMode, setEntryMode] = useState<'simple' | 'detailed'>(
    startsDetailed ? 'detailed' : mode === 'edit' ? 'detailed' : 'simple',
  );

  const [subtotalText, setSubtotalText] = useState(
    initial ? centsToText(initial.subtotalCents) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(
    initial?.paymentMethodId ?? null,
  );
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [dateStr, setDateStr] = useState<string>(
    initial ? toDateStr(initial.occurredAt) : todayStr(),
  );
  const [taxMode, setTaxMode] = useState<TaxMode>(initialTaxMode);
  const [extras, setExtras] = useState<ExtraRow[]>(initialExtras);
  const [isLoan, setIsLoan] = useState(initial?.source === 'loan');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initial?.tagIds ?? []);

  const subtotalCents = parseToCents(subtotalText);
  const ivaRate = settings.data?.iva_rate ?? 0.15;
  const ivaType = taxTypes.data?.find((tt) => tt.name === 'IVA');
  const currency = settings.data?.currency ?? 'USD';
  const isSimple = entryMode === 'simple';

  // El switch "Marcar como préstamo" solo aparece cuando está activa la etiqueta Préstamo.
  const prestamoTag = tags.data?.find(
    (tg) =>
      tg.name.trim().toLowerCase() === 'préstamo' || tg.name.trim().toLowerCase() === 'prestamo',
  );
  const prestamoSelected = !!prestamoTag && selectedTagIds.includes(prestamoTag.id);

  // En modo simple no hay ajustes: el monto capturado es el total.
  const adjustments = useMemo<AdjustmentInput[]>(() => {
    if (isSimple) return [];
    const list: AdjustmentInput[] = [];
    if (taxMode === 'iva' && subtotalCents > 0) {
      list.push({
        kind: 'tax',
        label: 'IVA',
        rate: ivaRate,
        amount_cents: Math.round(subtotalCents * ivaRate),
        tax_type_id: ivaType?.id ?? null,
      });
    }
    for (const e of extras) {
      const cents = parseToCents(e.amountText);
      if (cents > 0) {
        list.push({
          kind: e.kind,
          label: e.label.trim() || (e.kind === 'surcharge' ? 'Recargo' : 'Descuento'),
          amount_cents: cents,
        });
      }
    }
    return list;
  }, [isSimple, taxMode, subtotalCents, ivaRate, ivaType?.id, extras]);

  const net = adjustmentsNet(adjustments);
  const totalCents = subtotalCents + net;

  // taxStatus: simple → 'definido' (sin impuestos, no se expone en Inicio).
  const taxStatus: 'definido' | 'por_definir' =
    isSimple || taxMode !== 'pending' ? 'definido' : 'por_definir';

  const canSave =
    subtotalCents > 0 &&
    !!categoryId &&
    totalCents >= 0 &&
    !createTx.isPending &&
    !updateTx.isPending;

  function buildPayload() {
    return {
      type: 'expense' as const,
      subtotalCents,
      amountCents: totalCents,
      categoryId,
      paymentMethodId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      taxStatus,
      source: isLoan && prestamoSelected ? ('loan' as const) : ('manual' as const),
      adjustments,
      tagIds: selectedTagIds,
    };
  }

  async function onSave() {
    if (subtotalCents <= 0) {
      notify('Falta el monto', 'Escribe el monto del consumo.');
      return;
    }
    if (!categoryId) {
      notify('Falta categoría', 'Elige una categoría.');
      return;
    }
    if (totalCents < 0) {
      notify('Total negativo', 'Los descuentos superan al subtotal más recargos.');
      return;
    }
    try {
      if (mode === 'edit' && initial) {
        await updateTx.mutateAsync({
          id: initial.id,
          occurredAt: dateStrToISO(dateStr),
          ...buildPayload(),
        });
      } else {
        await createTx.mutateAsync({ occurredAt: dateStrToISO(dateStr), ...buildPayload() });
      }
      onDone();
    } catch (e: any) {
      notify('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirmAsync('Eliminar consumo', '¿Seguro? Esto no se puede deshacer.');
    if (!ok) return;
    try {
      await deleteTx.mutateAsync(initial.id);
      onDone();
    } catch (e: any) {
      notify('No se pudo eliminar', e?.message ?? 'Error desconocido');
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }

  const categoryOptions =
    categories.data?.map((c) => ({ id: c.id, label: c.name, icon: c.icon })) ?? [];
  const paymentOptions =
    paymentMethods.data?.map((p) => ({ id: p.id, label: p.label ?? p.kind })) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onDone} hitSlop={12}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {mode === 'edit' ? 'Editar consumo' : 'Nuevo consumo'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Switch de modo de captura */}
          <View style={styles.modeRow}>
            {(
              [
                { id: 'simple', label: 'Simple' },
                { id: 'detailed', label: 'Detallado' },
              ] as { id: 'simple' | 'detailed'; label: string }[]
            ).map((opt) => {
              const active = entryMode === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setEntryMode(opt.id)}
                  style={[styles.modeItem, active && styles.modeItemActive]}
                >
                  <Text style={[styles.modeText, active && styles.modeTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>{isSimple ? 'Monto' : 'Subtotal'}</Text>
          <MoneyInput value={subtotalText} onChangeText={setSubtotalText} />

          <Text style={styles.label}>Categoría</Text>
          {categoryOptions.length === 0 ? (
            <Text style={styles.hint}>Cargando catálogo…</Text>
          ) : (
            <CategoryPicker
              options={categoryOptions}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          )}

          {!isSimple && (
            <>
              <Text style={styles.label}>Medio de pago</Text>
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

              <Text style={styles.label}>Impuestos</Text>
              <View style={styles.segment}>
                {(
                  [
                    { id: 'iva', label: `IVA ${(ivaRate * 100).toFixed(0)}%` },
                    { id: 'none', label: 'Sin impuestos' },
                    { id: 'pending', label: 'Por definir' },
                  ] as { id: TaxMode; label: string }[]
                ).map((opt) => {
                  const active = taxMode === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setTaxMode(opt.id)}
                      style={[styles.segItem, active && styles.segItemActive]}
                    >
                      <Text style={[styles.segText, active && styles.segTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Recargos y descuentos</Text>
              {extras.map((row) => (
                <View key={row.id} style={styles.extraRow}>
                  <View
                    style={[
                      styles.extraBadge,
                      row.kind === 'discount' ? styles.badgeDiscount : styles.badgeSurcharge,
                    ]}
                  >
                    <Text style={styles.extraBadgeText}>
                      {row.kind === 'discount' ? '−' : '+'}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.extraLabel]}
                    value={row.label}
                    onChangeText={(t) =>
                      setExtras((xs) => xs.map((x) => (x.id === row.id ? { ...x, label: t } : x)))
                    }
                    placeholder="Concepto"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, styles.extraAmount]}
                    value={row.amountText}
                    onChangeText={(t) =>
                      setExtras((xs) =>
                        xs.map((x) => (x.id === row.id ? { ...x, amountText: t } : x)),
                      )
                    }
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                  />
                  <Pressable
                    onPress={() => setExtras((xs) => xs.filter((x) => x.id !== row.id))}
                    hitSlop={8}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.addRow}>
                <Pressable
                  onPress={() => setExtras((xs) => [...xs, newRow('surcharge')])}
                  style={styles.addBtn}
                >
                  <Text style={styles.addBtnText}>+ Recargo</Text>
                </Pressable>
                <Pressable
                  onPress={() => setExtras((xs) => [...xs, newRow('discount')])}
                  style={styles.addBtn}
                >
                  <Text style={styles.addBtnText}>+ Descuento</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Etiquetas</Text>
              {(tags.data?.length ?? 0) === 0 ? (
                <Text style={styles.hint}>Crea etiquetas en Ajustes.</Text>
              ) : (
                <View style={styles.tagWrap}>
                  {tags.data!.map((tg) => {
                    const active = selectedTagIds.includes(tg.id);
                    return (
                      <Pressable
                        key={tg.id}
                        onPress={() => toggleTag(tg.id)}
                        style={[styles.tagChip, active && styles.tagChipActive]}
                      >
                        <Text style={[styles.tagText, active && styles.tagTextActive]}>
                          {tg.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {prestamoSelected && (
                <View style={styles.loanRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loanTitle}>Marcar como préstamo</Text>
                    <Text style={styles.loanSub}>Dinero prestado o por devolver.</Text>
                  </View>
                  <Switch
                    value={isLoan}
                    onValueChange={setIsLoan}
                    trackColor={{ true: theme.coffee, false: theme.border }}
                    thumbColor={theme.foam}
                  />
                </View>
              )}

              <Text style={styles.label}>Comercio (opcional)</Text>
              <TextInput
                style={styles.input}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="¿Dónde fue?"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={styles.label}>Nota (opcional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Detalle…"
                placeholderTextColor={theme.textSecondary}
                multiline
              />

              {/* Resumen del desglose (sin indicador de cuadre: cuadra por construcción) */}
              <View style={styles.summary}>
                <SummaryLine label="Subtotal" value={formatMoney(subtotalCents, currency)} />
                {adjustments.map((a, i) => (
                  <SummaryLine
                    key={i}
                    label={`${a.kind === 'discount' ? '−' : '+'} ${a.label}`}
                    value={formatMoney(a.amount_cents, currency)}
                    muted={a.kind === 'discount'}
                  />
                ))}
                <View style={styles.summaryDivider} />
                <SummaryLine label="Total" value={formatMoney(totalCents, currency)} strong />
              </View>
            </>
          )}

          {mode === 'edit' && (
            <Pressable onPress={onDelete} style={styles.deleteBtn} disabled={deleteTx.isPending}>
              <Text style={styles.deleteText}>
                {deleteTx.isPending ? 'Eliminando…' : 'Eliminar consumo'}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={
              createTx.isPending || updateTx.isPending
                ? 'Guardando…'
                : mode === 'edit'
                  ? 'Guardar cambios'
                  : 'Guardar consumo'
            }
            onPress={onSave}
            loading={createTx.isPending || updateTx.isPending}
            disabled={!canSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryLine({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          strong && styles.summaryStrong,
          muted && { color: theme.success },
        ]}
      >
        {value}
      </Text>
    </View>
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
    modeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      backgroundColor: t.foam,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.xs,
      marginBottom: spacing.sm,
    },
    modeItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
    modeItemActive: { backgroundColor: t.coffee },
    modeText: { ...typography.body, color: t.textSecondary, fontWeight: '600' },
    modeTextActive: { color: t.textOnDark },
    label: {
      ...typography.caption,
      color: t.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hint: { ...typography.body, color: t.textSecondary },
    dateFieldWrap: { marginTop: spacing.sm },
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
    noteInput: { height: 80, paddingTop: spacing.md, textAlignVertical: 'top' },
    segment: { flexDirection: 'row', gap: spacing.sm },
    segItem: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
      alignItems: 'center',
    },
    segItemActive: { backgroundColor: t.coffee, borderColor: t.coffee },
    segText: { ...typography.caption, color: t.textPrimary },
    segTextActive: { color: t.textOnDark, fontWeight: '700' },
    extraRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    extraBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeSurcharge: { backgroundColor: t.warning },
    badgeDiscount: { backgroundColor: t.success },
    extraBadgeText: { color: t.textOnDark, fontWeight: '700', fontSize: 16 },
    extraLabel: { flex: 1 },
    extraAmount: { width: 96, textAlign: 'right' },
    remove: { ...typography.body, color: t.danger, paddingHorizontal: spacing.xs },
    addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    addBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.coffee,
      borderStyle: 'dashed',
    },
    addBtnText: { ...typography.body, color: t.caramel },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.xs },
    tagChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
    },
    tagChipActive: { backgroundColor: t.coffee, borderColor: t.coffee },
    tagText: { ...typography.body, color: t.textPrimary },
    tagTextActive: { color: t.textOnDark, fontWeight: '600' },
    loanRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      backgroundColor: t.foam,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.lg,
    },
    loanTitle: { ...typography.body, color: t.textPrimary, fontWeight: '600' },
    loanSub: { ...typography.caption, color: t.textSecondary, marginTop: 2 },
    summary: {
      marginTop: spacing.xl,
      backgroundColor: t.foam,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    summaryLine: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { ...typography.body, color: t.textSecondary },
    summaryValue: {
      ...typography.body,
      color: t.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    summaryStrong: { ...typography.subtitle, color: t.textPrimary, fontWeight: '700' },
    summaryDivider: { height: 1, backgroundColor: t.border, marginVertical: spacing.sm },
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
