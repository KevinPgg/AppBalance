import { ImageBackground, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, typography, radius } from '@/theme/typography';

type Props = {
  title?: string;
  subtitle?: string;
};

// Pantalla/placeholder para secciones en desarrollo.
// Usa el gif de public/under_construction como fondo. Sin audio (un gif no
// tiene sonido) y sin autoplay bloqueable: se ve igual en iOS Safari.
export function UnderConstruction({
  title = 'En construcción',
  subtitle = 'Estamos trabajando en esta sección. Vuelve pronto.',
}: Props) {
  return (
    <ImageBackground
      source={{ uri: '/under_construction/UnderConstruction.gif' }}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Velo para que el texto se lea sobre el gif. */}
      <View style={styles.veil} />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(59,42,36,0.55)' },
  card: {
    backgroundColor: colors.foam,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
