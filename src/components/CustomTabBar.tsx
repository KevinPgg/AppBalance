import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

const BAR_H = 68;

// Metadatos por ruta (orden de las pestañas de app/(tabs)/_layout.tsx).
const TABS: Record<string, { label: string; icon: string }> = {
  index: { label: 'Inicio', icon: '🏠' },
  dashboard: { label: 'Métricas', icon: '📊' },
  taxes: { label: 'Beneficios', icon: '🏷️' },
  settings: { label: 'Ajustes', icon: '⚙️' },
};

// Tab bar con botón central (+) que abre un speed-dial: Registrar consumo / ingreso.
export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: winH } = useWindowDimensions(); // responsive en PWA (se actualiza al redimensionar)
  const [open, setOpen] = useState(false);

  const barTotal = BAR_H + insets.bottom;

  function go(path: string) {
    setOpen(false);
    router.push(path as never);
  }

  function onTabPress(routeKey: string, routeName: string, index: number) {
    const focused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  function tabButton(routeKey: string, routeName: string, index: number) {
    const meta = TABS[routeName] ?? { label: routeName, icon: '•' };
    const focused = state.index === index;
    return (
      <Pressable
        key={routeKey}
        style={styles.tab}
        onPress={() => onTabPress(routeKey, routeName, index)}
      >
        <Text style={[styles.tabIcon, { color: focused ? theme.espresso : theme.muted }]}>
          {meta.icon}
        </Text>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{meta.label}</Text>
      </Pressable>
    );
  }

  // Reparte las rutas: mitad izquierda, FAB, mitad derecha.
  const routes = state.routes;
  const mid = Math.ceil(routes.length / 2);
  const left = routes.slice(0, mid);
  const right = routes.slice(mid);

  return (
    <>
      {open && (
        <>
          <Pressable
            style={[styles.overlay, { bottom: barTotal, height: winH }]}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.menu, { bottom: barTotal + 14 }]} pointerEvents="box-none">
            <Pressable style={[styles.item, styles.itemExpense]} onPress={() => go('/transaction/new')}>
              <View style={styles.itemIcon}>
                <Text style={styles.itemIconGlyph}>☕</Text>
              </View>
              <Text style={styles.itemTextExpense}>Registrar consumo</Text>
              <Text style={styles.itemTag}>gasto</Text>
            </Pressable>
            <Pressable style={[styles.item, styles.itemIncome]} onPress={() => go('/income/new')}>
              <View style={[styles.itemIcon, styles.itemIconIncome]}>
                <Text style={styles.itemIconGlyphIncome}>↑</Text>
              </View>
              <Text style={styles.itemTextIncome}>Registrar ingreso</Text>
              <Text style={styles.itemTagIncome}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={[styles.bar, { height: barTotal, paddingBottom: insets.bottom }]}>
        {left.map((r, i) => tabButton(r.key, r.name, i))}

        <View style={styles.fabSlot}>
          <Pressable onPress={() => setOpen((v) => !v)}>
            <LinearGradient
              colors={[theme.caramel, theme.accentDeep]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.fab}
            >
              <Text style={[styles.fabGlyph, open && styles.fabGlyphOpen]}>＋</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {right.map((r, i) => tabButton(r.key, r.name, mid + i))}
      </View>
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.line,
      paddingTop: 10,
      paddingHorizontal: spacing.sm,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3 },
    tabIcon: { fontSize: 19, height: 24, lineHeight: 24, textAlign: 'center' },
    tabLabel: { fontSize: 10, fontWeight: '600', color: t.muted, textAlign: 'center' },
    tabLabelActive: { color: t.textPrimary, fontWeight: '700' },
    fabSlot: { width: 64, alignItems: 'center' },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateY: -16 }],
      shadowColor: '#502832',
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    fabGlyph: { fontSize: 30, color: '#fff', lineHeight: 32 },
    fabGlyphOpen: { transform: [{ rotate: '45deg' }] },

    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      // height (= alto de ventana) y bottom (= alto de la barra) se fijan
      // inline: el overlay se extiende hacia arriba desde la barra y cubre
      // la pantalla, responsive al redimensionar (importante en PWA).
      backgroundColor: 'rgba(20,12,7,0.42)',
      zIndex: 8,
    },
    menu: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: 28,
      gap: spacing.md,
      zIndex: 9,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 15,
      paddingHorizontal: 18,
      borderRadius: 18,
    },
    itemExpense: {
      backgroundColor: t.espresso,
      shadowColor: '#281414',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    itemIncome: {
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.line,
      shadowColor: '#281414',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6,
    },
    itemIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    itemIconIncome: { backgroundColor: 'rgba(110,139,91,0.16)' },
    itemIconGlyph: { fontSize: 15 },
    itemIconGlyphIncome: { fontSize: 16, color: t.pos, fontWeight: '800' },
    itemTextExpense: { ...typography.subtitle, fontWeight: '700', color: t.onAccent },
    itemTextIncome: { ...typography.subtitle, fontWeight: '700', color: t.textPrimary },
    itemTag: { ...typography.caption, color: t.onAccent, opacity: 0.6, marginLeft: 'auto' },
    itemTagIncome: { ...typography.caption, color: t.pos, fontWeight: '700', marginLeft: 'auto' },
  });