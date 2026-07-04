import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { spacing, typography } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export default function TaxesScreen() {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    inner: { padding: spacing.xl, gap: spacing.lg },
    title: { ...typography.title, color: t.textPrimary },
    body: { ...typography.body, color: t.textSecondary },
  });
