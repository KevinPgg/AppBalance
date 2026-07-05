import {
  View,
  ScrollView,
  Pressable,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { categoryIconUri } from '@/features/catalog/categoryIcons';

export type CategoryOption = {
  id: string;
  label: string;
  icon?: string | null;
};

type Props = {
  options: CategoryOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Alto del contenedor como fracción de la pantalla (30% por defecto).
  heightRatio?: number;
};

const TILE_H = 44;

// Selector de categoría en grilla de alto fijo (~30% de pantalla).
// Los tiles se apilan en columnas (llenan de arriba a abajo) hasta el límite
// del contenedor; lo que sobra se navega con scroll horizontal.
export function CategoryPicker({ options, selectedId, onSelect, heightRatio = 0.3 }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { height } = useWindowDimensions();
  const containerHeight = Math.round(height * heightRatio);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.grid, { height: containerHeight }]}>
          {options.map((opt) => {
            const active = opt.id === selectedId;
            const uri = categoryIconUri(opt.icon);
            return (
              <Pressable
                key={opt.id}
                onPress={() => onSelect(opt.id)}
                style={[styles.tile, active && styles.tileActive]}
              >
                {uri ? (
                  <View style={styles.iconChip}>
                    <Image source={{ uri }} style={styles.icon} />
                  </View>
                ) : (
                  <Text style={styles.emoji}>{opt.icon ?? '•'}</Text>
                )}
                <Text
                  style={[styles.label, active && styles.labelActive]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { marginVertical: spacing.sm },
    grid: { flexDirection: 'column', flexWrap: 'wrap', alignContent: 'flex-start' },
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      width: 150,
      height: TILE_H,
      paddingHorizontal: spacing.md,
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.foam,
    },
    tileActive: { backgroundColor: t.caramel, borderColor: t.ink, borderWidth: 3 },
    icon: { width: 22, height: 22, resizeMode: 'contain' },
    iconChip: {
      backgroundColor: t.iconBg,
      borderRadius: 8,
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: 18, width: 22, textAlign: 'center' },
    label: { ...typography.body, color: t.textPrimary, flex: 1 },
    labelActive: { color: t.heroTo, fontWeight: '700' },
  });
