import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme/colors';
import { useEnsureSetup } from '@/features/catalog/useEnsureSetup';

// Iconos placeholder (emoji) hasta integrar un set de iconos de tacitas en Fase 1.
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

export default function TabsLayout() {
  // Siembra el catálogo base la primera vez que entra el usuario.
  useEnsureSetup();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coffee,
        tabBarInactiveTintColor: colors.sage,
        tabBarStyle: { backgroundColor: colors.foam, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon icon="☕" color={color} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Métricas', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="taxes"
        options={{ title: 'Beneficios', tabBarIcon: ({ color }) => <TabIcon icon="🏷️" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}
