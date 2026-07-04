import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { spacing, typography } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export default function DashboardScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Métricas</Text>
        <Card>
          <Text style={styles.body}>
            Aquí irán las métricas de consumo (total del mes, por categoría, por medio de
            pago, tendencia). Fase 3 del plan de desarrollo.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    inner: { padding: spacing.xl, gap: spacing.lg },
    title: { ...typography.title, color: t.textPrimary },
    body: { ...typography.body, color: t.textSecondary },
  });
