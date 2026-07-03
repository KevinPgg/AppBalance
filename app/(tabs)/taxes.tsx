import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';
import { spacing, typography } from '@/theme/typography';

export default function TaxesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Impuestos y beneficios</Text>
        <Card>
          <Text style={styles.body}>
            Análisis de impuestos (con indicador de cobertura) y de beneficios por
            promociones: cuánto ahorraste y qué días conviene comprar qué. Fase 3.
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
