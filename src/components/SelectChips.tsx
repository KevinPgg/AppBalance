import { ScrollView, Pressable, Text, Image, View, StyleSheet } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { categoryIconUri } from '@/features/catalog/categoryIcons';

export type ChipOption = {
  id: string;
  label: string;
  icon?: string | null;
};

type Props = {
  options: ChipOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// Selector horizontal de una sola opción. Táctil, sin dependencias de picker.
// Si el icono es un PNG (categorías nuevas) lo muestra como imagen; si es un
// emoji viejo, lo antepone como texto.
export function SelectChips({ options, selectedId, onSelect }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.id === selectedId;
        const iconUri = categoryIconUri(opt.icon);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {iconUri ? (
              <View style={styles.chipRow}>
                <Image source={{ uri: iconUri }} style={styles.icon} />
                <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
              </View>
            ) : (
              <Text style={[styles.text, active && styles.textActive]}>
                {opt.icon ? `${opt.icon} ` : ''}
                {opt.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    // NOTA: en React Native Web (PWA) `gap` sobre el contentContainer de un
    // ScrollView horizontal no se aplica de forma fiable; los chips quedaban
    // pegados. Se usa marginRight por chip (igual que CategoryPicker).
    row: { paddingVertical: spacing.xs, alignItems: 'center' },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
    },
    chipActive: { backgroundColor: t.coffee, borderColor: t.coffee },
    chipRow: { flexDirection: 'row', alignItems: 'center' },
    icon: { width: 20, height: 20, resizeMode: 'contain', marginRight: spacing.sm },
    text: { ...typography.body, color: t.textPrimary },
    textActive: { color: t.textOnDark, fontWeight: '600' },
  });
