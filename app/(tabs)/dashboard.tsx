import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';

export default function DashboardScreen() {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  inner: { padding: spacing.xl, gap: spacing.lg },
  title: { ...typography.title, color: colors.espresso },
  body: { ...typography.body, color: colors.textSecondary },
});
