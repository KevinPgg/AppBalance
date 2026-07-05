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
import { CategoryPicker } from '@/components/CategoryPicker';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { centsToText, parseToCents } from '@/lib/money';
import { confirmAsync, notify } from '@/lib/confirm';
import { useCategories } from '@/features/catalog/useCatalog';
import { useTags } from '@/features/catalog/useTags';
import {
  type BudgetScope,
  type BudgetPeriod,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '@/features/budgets/useBudgets';

export type BudgetFormInitial = {
  id: string;
  name: string | null;
  scope: BudgetScope;
  categoryId: string | null;
  tagId: string | null;
  limitCents: number;
  period: BudgetPeriod;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: BudgetFormInitial;
  onDone: () => void;
};

const SCOPES: { id: BudgetScope; label: string }[] = [
  { id: 'global', label: 'Todo' },
  { id: 'category', label: 'Categoría' },
  { id: 'tag', label: 'Etiqueta' },
];

const PERIODS: { id: BudgetPeriod; label: string }[] = [
  { id: 'monthly', label: 'Mensual' },
  { id: 'weekly', label: 'Semanal' },
];

export function BudgetForm({ mode, initial, onDone }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const categories = useCategories();
  const tags = useTags();
  const createB = useCreateBudget();
  const updateB = useUpdateBudget();
  const deleteB = useDeleteBudget();

  const [name, setName] = useState(initial?.name ?? '');
  const [scope, setScope] = useState<BudgetScope>(initial?.scope ?? 'global');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [tagId, setTagId] = useState<string | null>(initial?.tagId ?? null);
  const [limitText, setLimitText] = useState(initial ? centsToText(initial.limitCents) : '');
  const [period, setPeriod] = useState<BudgetPeriod>(initial?.period ?? 'monthly');

  const limitCents = parseToCents(limitText);
  const isBusy = createB.isPending || updateB.isPending;
  const scopeOk =
    scope === 'global' ||
    (scope === 'category' && !!categoryId) ||
    (scope === 'tag' && !!tagId);
  const canSave = limitCents > 0 && scopeOk && !isBusy;

  const categoryOptions =
    categories.data?.map((c) => ({ id: c.id, label: c.name, icon: c.icon })) ?? [];
  const tagOptions = tags.data?.map((t) => ({ id: t.id, label: t.name })) ?? [];

  async function onSave() {
    if (limitCents <= 0) {
      notify('Falta el límite', 'Escribe el monto máximo del presupuesto.');
      return;
    }
    if (!scopeOk) {
      notify('Falta el alcance', 'Elige la categoría o etiqueta del presupuesto.');
      return;
    }
    const payload = {
      name: name.trim() || null,
      scope,
      categoryId,
      tagId,
      limitCents,
      period,
    };
    try {
      if (mode === 'edit' && initial) {
        await updateB.mutateAsync({ id: initial.id, ...payload });
      } else {
        await createB.mutateAsync(payload);
      }
      onDone();
    } catch (e: any) {
      notify('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirmAsync('Eliminar presupuesto', '¿Seguro? Esto no se puede deshacer.');
    if (!ok) return;
    try {
      await deleteB.mutateAsync(initial.id);
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
          {mode === 'edit' ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nombre (opcional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej. Café del mes"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={styles.label}>Alcance</Text>
          <View style={styles.segment}>
            {SCOPES.map((opt) => {
              const active = scope === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setScope(opt.id)}
                  style={[styles.segItem, active && styles.segItemActive]}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {scope === 'category' && (
            <>
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
            </>
          )}

          {scope === 'tag' && (
            <>
              <Text style={styles.label}>Etiqueta</Text>
              {tagOptions.length === 0 ? (
                <Text style={styles.hint}>Crea etiquetas en Ajustes.</Text>
              ) : (
                <SelectChips options={tagOptions} selectedId={tagId} onSelect={setTagId} />
              )}
            </>
          )}

          <Text style={styles.label}>Límite</Text>
          <MoneyInput value={limitText} onChangeText={setLimitText} />

          <Text style={styles.label}>Período</Text>
          <View style={styles.segment}>
            {PERIODS.map((opt) => {
              const active = period === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPeriod(opt.id)}
                  style={[styles.segItem, active && styles.segItemActive]}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'edit' && (
            <Pressable onPress={onDelete} style={styles.deleteBtn} disabled={deleteB.isPending}>
              <Text style={styles.deleteText}>
                {deleteB.isPending ? 'Eliminando…' : 'Eliminar presupuesto'}
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isBusy ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear presupuesto'}
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
    hint: { ...typography.body, color: t.textSecondary },
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
