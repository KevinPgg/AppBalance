import { ImageBackground, View, Text, StyleSheet } from 'react-native';
import { spacing, typography, radius } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(59,42,36,0.55)' },
    card: {
      backgroundColor: t.foam,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      marginHorizontal: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: { ...typography.title, color: t.textPrimary, textAlign: 'center' },
    subtitle: { ...typography.body, color: t.textSecondary, textAlign: 'center' },
  });
