import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme, useThemeStore } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import {
  THEME_LABELS,
  FAMILY_SWATCHES,
  type Theme,
  type ThemeFamily,
  type ThemeMode,
} from '@/theme/themes';
import { confirmAsync, notify } from '@/lib/confirm';
import { useAuth } from '@/store/auth';
import {
  useAppSettings,
  usePaymentMethods,
  useCategories,
  type PaymentMethodKind,
} from '@/features/catalog/useCatalog';
import {
  useSetIvaRate,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/features/catalog/useCatalogMutations';
import { useTags, useCreateTag, useDeleteTag } from '@/features/catalog/useTags';
import { CATEGORY_ICONS, categoryIconUri } from '@/features/catalog/categoryIcons';

const PM_KINDS: { id: PaymentMethodKind; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'indefinido', label: 'Sin definir' },
];

// Selector horizontal de iconos reutilizable (alta y edición).
function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
      {CATEGORY_ICONS.map((icon) => {
        const active = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            style={[styles.iconTile, active && styles.iconTileActive]}
          >
            <Image source={{ uri: `/iconos-categoria/${icon}` }} style={styles.tileImg} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Tarjeta-acordeón: colapsada muestra solo el título.
function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader} hitSlop={6}>
        <Text style={styles.section}>{title}</Text>
        <Text style={styles.chevron}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && <View style={styles.cardBody}>{children}</View>}
    </Card>
  );
}

// Selector de paleta (familia) + modo (claro/oscuro). En Ajustes → Cuenta.
function ThemeSelector() {
  const styles = useThemedStyles(makeStyles);
  const family = useThemeStore((s) => s.family);
  const mode = useThemeStore((s) => s.mode);
  const setFamily = useThemeStore((s) => s.setFamily);
  const setMode = useThemeStore((s) => s.setMode);

  const families: { id: ThemeFamily; name: string }[] = [
    { id: 'cafe', name: 'Café' },
    { id: 'cherry', name: 'Cherry' },
  ];
  const modes: { id: ThemeMode; glyph: string }[] = [
    { id: 'light', glyph: '☀' },
    { id: 'dark', glyph: '☾' },
  ];

  return (
    <View>
      <Text style={styles.addLabel}>Paleta</Text>
      <View style={styles.paletteGrid}>
        {families.map((f) => {
          const active = f.id === family;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFamily(f.id)}
              style={[styles.palette, active && styles.paletteActive]}
            >
              <View style={styles.swatches}>
                {FAMILY_SWATCHES[f.id].map((c, i) => (
                  <View key={i} style={[styles.sw, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={[styles.paletteName, active && styles.paletteNameActive]}>
                {f.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.addLabel}>Modo</Text>
      <View style={styles.segmented}>
        {modes.map((m) => {
          const active = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={[styles.segBtn, active && styles.segBtnActive]}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {m.glyph}  {THEME_LABELS[family][m.id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const signOut = useAuth((s) => s.signOut);
  const session = useAuth((s) => s.session);

  const settings = useAppSettings();
  const categories = useCategories();
  const paymentMethods = usePaymentMethods();
  const tags = useTags();

  const setIva = useSetIvaRate();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createPM = useCreatePaymentMethod();
  const deletePM = useDeletePaymentMethod();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const currentIva = settings.data ? Math.round(settings.data.iva_rate * 100) : 15;

  const [ivaText, setIvaText] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [pmLabel, setPmLabel] = useState('');
  const [pmKind, setPmKind] = useState<PaymentMethodKind>('efectivo');
  const [tagName, setTagName] = useState('');

  // Edición de categoría existente.
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState<string>(CATEGORY_ICONS[0]);

  // Qué tarjeta está abierta (null = todas colapsadas).
  const [openCard, setOpenCard] = useState<string | null>(null);
  const toggle = (id: string) => setOpenCard((cur) => (cur === id ? null : id));

  async function onSaveIva() {
    const pct = Number(ivaText);
    if (!ivaText || Number.isNaN(pct) || pct < 0 || pct > 100) {
      notify('IVA inválido', 'Escribe un porcentaje entre 0 y 100.');
      return;
    }
    try {
      await setIva.mutateAsync(pct / 100);
      setIvaText('');
    } catch (e: any) {
      notify('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onAddCategory() {
    if (!catName.trim()) {
      notify('Falta el nombre', 'Ponle nombre a la categoría.');
      return;
    }
    try {
      await createCategory.mutateAsync({ name: catName, icon: catIcon });
      setCatName('');
    } catch (e: any) {
      notify('No se pudo crear', e?.message ?? 'Error desconocido');
    }
  }

  function startEditCategory(id: string, name: string, icon: string | null) {
    setEditCatId(id);
    setEditCatName(name);
    setEditCatIcon(icon ?? CATEGORY_ICONS[0]);
  }

  function cancelEditCategory() {
    setEditCatId(null);
    setEditCatName('');
  }

  async function onSaveEditCategory() {
    if (!editCatId) return;
    if (!editCatName.trim()) {
      notify('Falta el nombre', 'La categoría necesita un nombre.');
      return;
    }
    try {
      await updateCategory.mutateAsync({
        id: editCatId,
        name: editCatName,
        icon: editCatIcon,
      });
      cancelEditCategory();
    } catch (e: any) {
      notify('No se pudo guardar', e?.message ?? 'Error desconocido');
    }
  }

  async function onDeleteCategory(id: string, name: string) {
    const ok = await confirmAsync(
      'Eliminar categoría',
      `¿Eliminar "${name}"? Los consumos que la usaban quedarán sin categoría.`,
    );
    if (!ok) return;
    try {
      await deleteCategory.mutateAsync(id);
      if (editCatId === id) cancelEditCategory();
    } catch (e: any) {
      notify('No se pudo eliminar', e?.message ?? 'Error desconocido');
    }
  }

  async function onAddPM() {
    if (!pmLabel.trim()) {
      notify('Falta el nombre', 'Escribe una etiqueta para el medio de pago.');
      return;
    }
    try {
      await createPM.mutateAsync({ kind: pmKind, label: pmLabel });
      setPmLabel('');
    } catch (e: any) {
      notify('No se pudo crear', e?.message ?? 'Error desconocido');
    }
  }

  async function onDeletePM(id: string, label: string) {
    const ok = await confirmAsync('Eliminar medio de pago', `¿Eliminar "${label}"?`);
    if (!ok) return;
    try {
      await deletePM.mutateAsync(id);
    } catch (e: any) {
      notify('No se pudo eliminar', e?.message ?? 'Error desconocido');
    }
  }

  async function onAddTag() {
    if (!tagName.trim()) {
      notify('Falta el nombre', 'Escribe el nombre de la etiqueta.');
      return;
    }
    try {
      await createTag.mutateAsync({ name: tagName });
      setTagName('');
    } catch (e: any) {
      notify('No se pudo crear', e?.message ?? 'Error desconocido');
    }
  }

  async function onDeleteTag(id: string, name: string) {
    const ok = await confirmAsync('Eliminar etiqueta', `¿Eliminar "${name}"?`);
    if (!ok) return;
    try {
      await deleteTag.mutateAsync(id);
    } catch (e: any) {
      notify('No se pudo eliminar', e?.message ?? 'Error desconocido');
    }
  }

  async function onSignOut() {
    const ok = await confirmAsync('Cerrar sesión', '¿Seguro que quieres salir?', 'Cerrar sesión');
    if (ok) await signOut();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* IVA */}
        <CollapsibleCard title="IVA" open={openCard === 'iva'} onToggle={() => toggle('iva')}>
          <Text style={styles.hint}>Tasa actual: {currentIva}%</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={ivaText}
              onChangeText={setIvaText}
              placeholder={`${currentIva}`}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={3}
            />
            <Text style={styles.pct}>%</Text>
            <View style={styles.grow} />
            <Button title="Guardar" onPress={onSaveIva} loading={setIva.isPending} />
          </View>
        </CollapsibleCard>

        {/* Categorías */}
        <CollapsibleCard
          title="Categorías"
          open={openCard === 'cat'}
          onToggle={() => toggle('cat')}
        >
          {(categories.data ?? []).map((c) => {
            const uri = categoryIconUri(c.icon);
            const isEditing = editCatId === c.id;
            return (
              <View key={c.id}>
                <View style={styles.itemRow}>
                  {uri ? (
                    <View style={styles.itemIconChip}>
                      <Image source={{ uri }} style={styles.itemIcon} />
                    </View>
                  ) : (
                    <Text style={styles.itemEmoji}>{c.icon ?? '•'}</Text>
                  )}
                  <Text style={styles.itemName}>{c.name}</Text>
                  <Pressable
                    onPress={() =>
                      isEditing ? cancelEditCategory() : startEditCategory(c.id, c.name, c.icon)
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.action}>{isEditing ? 'Cerrar' : 'Editar'}</Text>
                  </Pressable>
                  <Pressable onPress={() => onDeleteCategory(c.id, c.name)} hitSlop={8}>
                    <Text style={styles.delete}>Eliminar</Text>
                  </Pressable>
                </View>
                {isEditing && (
                  <View style={styles.editBox}>
                    <IconPicker value={editCatIcon} onChange={setEditCatIcon} />
                    <View style={styles.inlineRow}>
                      <TextInput
                        style={[styles.input, styles.grow]}
                        value={editCatName}
                        onChangeText={setEditCatName}
                        placeholder="Nombre de la categoría"
                        placeholderTextColor={theme.textSecondary}
                      />
                      <Button
                        title="Guardar"
                        onPress={onSaveEditCategory}
                        loading={updateCategory.isPending}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.addLabel}>Nueva categoría</Text>
          <IconPicker value={catIcon} onChange={setCatIcon} />
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.grow]}
              value={catName}
              onChangeText={setCatName}
              placeholder="Nombre de la categoría"
              placeholderTextColor={theme.textSecondary}
            />
            <Button title="Añadir" onPress={onAddCategory} loading={createCategory.isPending} />
          </View>
        </CollapsibleCard>

        {/* Medios de pago */}
        <CollapsibleCard
          title="Medios de pago"
          open={openCard === 'pm'}
          onToggle={() => toggle('pm')}
        >
          {(paymentMethods.data ?? []).map((p) => (
            <View key={p.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{p.label ?? p.kind}</Text>
              <Pressable onPress={() => onDeletePM(p.id, p.label ?? p.kind)} hitSlop={8}>
                <Text style={styles.delete}>Eliminar</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.addLabel}>Nuevo medio de pago</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PM_KINDS.map((k) => {
              const active = k.id === pmKind;
              return (
                <Pressable
                  key={k.id}
                  onPress={() => setPmKind(k.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{k.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.grow]}
              value={pmLabel}
              onChangeText={setPmLabel}
              placeholder="Ej. Visa terminación 1234"
              placeholderTextColor={theme.textSecondary}
            />
            <Button title="Añadir" onPress={onAddPM} loading={createPM.isPending} />
          </View>
        </CollapsibleCard>

        {/* Etiquetas */}
        <CollapsibleCard
          title="Etiquetas"
          open={openCard === 'tag'}
          onToggle={() => toggle('tag')}
        >
          {(tags.data ?? []).map((t) => (
            <View key={t.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{t.name}</Text>
              <Pressable onPress={() => onDeleteTag(t.id, t.name)} hitSlop={8}>
                <Text style={styles.delete}>Eliminar</Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.addLabel}>Nueva etiqueta</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, styles.grow]}
              value={tagName}
              onChangeText={setTagName}
              placeholder="Nueva etiqueta"
              placeholderTextColor={theme.textSecondary}
            />
            <Button title="Añadir" onPress={onAddTag} loading={createTag.isPending} />
          </View>
        </CollapsibleCard>

        {/* Cuenta */}
        <CollapsibleCard
          title="Cuenta"
          open={openCard === 'acc'}
          onToggle={() => toggle('acc')}
        >
          <Text style={styles.hint}>{session?.user?.email ?? 'Sesión iniciada'}</Text>
          <ThemeSelector />
          <View style={styles.signOut}>
            <Button title="Cerrar sesión" variant="secondary" onPress={onSignOut} />
          </View>
        </CollapsibleCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    header: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    title: { ...typography.title, color: t.textPrimary },
    body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
    card: { gap: spacing.sm },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardBody: { gap: spacing.sm, marginTop: spacing.sm },
    section: { ...typography.subtitle, color: t.textPrimary },
    chevron: { ...typography.title, color: t.textSecondary, lineHeight: 24 },
    hint: { ...typography.caption, color: t.textSecondary },
    addLabel: {
      ...typography.caption,
      color: t.textSecondary,
      marginTop: spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    grow: { flex: 1 },
    input: {
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      height: 46,
      ...typography.body,
      color: t.textPrimary,
    },
    inputSmall: { width: 80, textAlign: 'center' },
    pct: { ...typography.subtitle, color: t.textSecondary },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    itemIcon: { width: 32, height: 32, resizeMode: 'contain' },
    itemIconChip: {
      backgroundColor: t.iconBg,
      borderRadius: 10,
      padding: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemEmoji: { fontSize: 28, width: 32, textAlign: 'center' },
    itemName: { ...typography.body, color: t.textPrimary, flex: 1 },
    action: { ...typography.caption, color: t.caramel, fontWeight: '600' },
    delete: { ...typography.caption, color: t.danger, fontWeight: '600' },
    editBox: {
      paddingBottom: spacing.md,
      paddingLeft: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    iconPicker: { marginVertical: spacing.sm },
    iconTile: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    iconTileActive: { borderColor: t.coffee, borderWidth: 2 },
    tileImg: { width: 34, height: 34, resizeMode: 'contain' },
    chipRow: { marginVertical: spacing.sm },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
      marginRight: spacing.sm,
    },
    chipActive: { backgroundColor: t.coffee, borderColor: t.coffee },
    chipText: { ...typography.body, color: t.textPrimary },
    chipTextActive: { color: t.textOnDark, fontWeight: '600' },
    segmented: {
      flexDirection: 'row',
      backgroundColor: t.foamToken,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 13,
      padding: 4,
      marginVertical: spacing.sm,
    },
    segBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segBtnActive: { backgroundColor: t.espresso },
    segText: { ...typography.caption, color: t.muted, fontWeight: '700' },
    segTextActive: { color: t.onAccent, fontWeight: '700' },
    paletteGrid: { flexDirection: 'row', gap: 10, marginVertical: spacing.sm },
    palette: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 13,
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.line,
    },
    paletteActive: { backgroundColor: t.foamToken, borderColor: t.caramel },
    paletteName: { ...typography.body, color: t.muted, fontWeight: '700' },
    paletteNameActive: { color: t.ink },
    swatches: { flexDirection: 'row', gap: 5, marginBottom: 9 },
    sw: { width: 20, height: 20, borderRadius: 6 },
    signOut: { marginTop: spacing.md },
  });