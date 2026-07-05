import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { formatMoney } from '@/lib/money';

type Props = {
  balanceCents: number;
  spentCents?: number;
  incomeCents?: number;
  name?: string | null;
  currency?: string;
  loading?: boolean;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Cabecera de Inicio: saludo + card de saldo con degradado (hero) y pills
// de gastado / ingresos del mes.
export function BalanceHeader({
  balanceCents,
  spentCents = 0,
  incomeCents = 0,
  name,
  currency = 'USD',
  loading,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const negative = balanceCents < 0;
  const monthLabel = MONTHS[new Date().getMonth()];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      {/* Saludo */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.greetSmall}>{greeting()}</Text>
          {!!name && <Text style={styles.greetName}>{name}</Text>}
        </View>
      </View>

      {/* Hero */}
      <LinearGradient
        colors={[theme.heroFrom, theme.heroTo]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.blob} />
        <View style={styles.blob2} />
        <Text style={styles.label}>💳  Saldo actual</Text>
        <Text style={[styles.amount, negative && styles.amountNeg]}>
          {loading ? '—' : formatMoney(balanceCents, currency)}
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statK}>GASTADO · {monthLabel}</Text>
            <Text style={[styles.statV, styles.statSpent]}>
              {formatMoney(spentCents, currency).replace(/^[-−]/, '')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statK}>INGRESOS</Text>
            <Text style={[styles.statV, styles.statIncome]}>
              {formatMoney(incomeCents, currency).replace(/^[-−]/, '')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: t.cream,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    greetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    greetSmall: { ...typography.caption, color: t.textSecondary },
    greetName: { ...typography.subtitle, color: t.textPrimary, fontWeight: '700' },
    cup: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cupGlyph: { fontSize: 18 },
    hero: {
      borderRadius: 26,
      padding: 22,
      overflow: 'hidden',
      shadowColor: '#1E0F14',
      shadowOpacity: 0.35,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
    blob: {
      position: 'absolute',
      top: -46,
      right: -34,
      width: 158,
      height: 158,
      borderRadius: 79,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    // Segundo círculo decorativo: esquina inferior-izquierda. Queda DETRÁS de los
    // pills (se renderiza antes) y, como los pills ahora son opacos, solo asoma
    // en la esquina sin transparentarse sobre "Gastado".
    blob2: {
      position: 'absolute',
      bottom: -52,
      left: -40,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    label: { ...typography.caption, color: t.onHeroDim, fontWeight: '600' },
    amount: {
      ...typography.display,
      fontSize: 44,
      color: t.onHero,
      fontVariant: ['tabular-nums'],
      marginTop: 4,
    },
    amountNeg: { color: t.onHeroWarm },
    stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    stat: {
      flex: 1,
      backgroundColor: t.heroPanel,
      borderWidth: 1,
      borderColor: t.heroPanelBorder,
      borderRadius: 13,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    statK: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: t.onHeroDim },
    statV: { ...typography.subtitle, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
    statSpent: { color: t.onHeroWarm },
    statIncome: { color: t.onHeroGreen },
  });
