import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useEnsureSetup } from '@/features/catalog/useEnsureSetup';

export default function TabsLayout() {
  // Siembra el catálogo base la primera vez que entra el usuario.
  useEnsureSetup();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Métricas' }} />
      <Tabs.Screen name="taxes" options={{ title: 'Beneficios' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
