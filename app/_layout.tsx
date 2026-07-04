import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/store/auth';
import { useThemeStore } from '@/store/theme';

function AuthGate() {
  const { session, initializing, init } = useAuth();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init();
    hydrateTheme();
  }, [init, hydrateTheme]);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="income/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="income/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fixed/index" />
      <Stack.Screen name="fixed/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fixed/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="budgets/index" />
      <Stack.Screen name="budgets/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="budgets/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  // Texto claro en modo oscuro (Espresso/Dark Cherry), oscuro en modo claro.
  const mode = useThemeStore((s) => s.mode);
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedStatusBar />
        <AuthGate />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
