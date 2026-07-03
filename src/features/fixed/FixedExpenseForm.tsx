import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { MoneyInput } from '@/components/MoneyInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import { centsToText, parseToCents } from '@/lib/money';
import { confirmAsync, notify } from '@/lib/confirm';
import { useCategories } from '@/features/catalog/useCatalog';
import {
  useCreateFixedExpense,
  useUpdateFixedExpense,
  useDeleteFixedExpense,
} from '@/features/fixed/useFixedExpenses';

export type FixedFormInitial = {
  id: string;
  name: string;
  amountCents: number;
  categoryId: string | null;
  dueDay: number | null;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: FixedFormInitial;
  onDone: () => void;
};

export function FixedExpenseForm({ mode, initial, onDone }: Props) {
  const categories = useCategories();
  const createFe = useCreateFixedExpense();
  const updateFe = useUpdateFixedExpense();
  const deleteFe = useDeleteFixedExpense();

  const [name, setName] = useState(initial?.name ?? '');
  const [amountText, setAmountText] = useState(
    initial ? centsToText(initial.amountCents) : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [dueDayText, setDueDayText] = useState(
    initial?.dueDay != null ? String(initial.dueDay) : '',
  );

  const amountCents = parseToCents(amountText);
  const dueDay = dueDayText.trim() === '' ? null : Number.parseInt(dueDayText, 10);
  const isBusy = createFe.isPending || updateFe.isPending;
  const canSave = name.trim().length > 0 && amountCents > 0 && !isBusy;

  const categoryOptions =
    categories.data?.map((c) => ({ id: c.id, label: c.name, icon: c.icon })) ?? [];

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre al gasto fijo.');
      return;
    }
    if (amountCents <= 0) {
      Alert.alert('Falta el monto', 'Escribe el monto mensual.');
      return;
    }
    if (dueDay != null && (dueDay < 1 || dueDay > 31)) {
      Alert.alert('Día inválido', 'El día de cobro debe estar entre 1 y 31.');
      return;
    }
    const payload = {
      name,
      amountCents,
      categoryId,
      dueDay,
      recurrence: 'monthly' as const,
    };
    try {
      if (mode === 'edit' && initial) {
        await updateFe.mutateAsync({ id: initial.id, ...payload });
      } else {
        await createFe.mutateAsync(payload);
      }
      onDone();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirmAsync(
      'Eliminar gasto fijo',
      'Se elimina el gasto fijo y sus períodos. Los consumos ya registrados se conservan.',
    );
    if (!ok) return;
    try {
      await deleteFe.mutateAsync(initial.id);
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
          {mode === 'edit' ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Renta, Netflix, Internet…"
            placeholderTextColor={colors.textSecondary}
            autoFocus={mode === 'create'}
          />

          <Text style={styles.label}>Monto mensual</Text>
          <MoneyInput value={amountText} onChangeText={setAmountText} />

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

          <Text style={styles.label}>Día de cobro (opcional)</Text>
          <TextInput
            style={[styles.input, { width: 110 }]}
            value={dueDayText}
            onChangeText={setDueDayText}
            placeholder="1–31"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
          />
          <Text style={styles.hint}>
            Se repite cada mes. Avisaremos cuando se acerque la fecha de cobro.
          </Text>

          {mode === 'edit' && (
            <Pressable onPress={onDelete} style={styles.deleteBtn} disabled={deleteFe.isPending}>
              <Text style={styles.deleteText}>
                {deleteFe.isPending ? 'Eliminando…' : 'Eliminar gasto fijo'}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isBusy ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear gasto fijo'}
            onPress={onSave}
            loading={isBusy}
            disabled={!canSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.subtitle, color: colors.espresso },
  cancel: { ...typography.body, color: colors.coffee, width: 64 },
  body: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xs, flexGrow: 1 },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.foam,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...typography.body,
    color: colors.textPrimary,
  },
  deleteBtn: {
    marginTop: 'auto',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteText: { ...typography.subtitle, color: colors.danger },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
  },
});
