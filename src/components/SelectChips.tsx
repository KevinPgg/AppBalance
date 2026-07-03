import { ScrollView, Pressable, Text, Image, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
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

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.foam,
  },
  chipActive: { backgroundColor: colors.coffee, borderColor: colors.coffee },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 20, height: 20, resizeMode: 'contain' },
  text: { ...typography.body, color: colors.textPrimary },
  textActive: { color: colors.textOnDark, fontWeight: '600' },
});
