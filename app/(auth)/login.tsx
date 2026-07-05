import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';
import { notify } from '@/lib/confirm';
import { useAuth } from '@/store/auth';

export default function LoginScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);

  async function onSubmit() {
    if (!email.includes('@')) {
      notify('Email inválido', 'Escribe un correo válido.');
      return;
    }
    if (password.length < 6) {
      notify('Contraseña corta', 'Usa al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) notify('Error', error);
    // Si todo va bien, AuthGate redirige solo al detectar la sesión.
  }

  const isSignin = mode === 'signin';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.brand}>AppBalance ☕</Text>
        <Text style={styles.subtitle}>Tu tarde de trabajo, en orden.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button
            title={isSignin ? 'Entrar' : 'Crear cuenta'}
            onPress={onSubmit}
            loading={loading}
          />
          <Pressable onPress={() => setMode(isSignin ? 'signup' : 'signin')}>
            <Text style={styles.switch}>
              {isSignin
                ? '¿Primera vez? Crear cuenta'
                : '¿Ya tienes cuenta? Entrar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.cream },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
    brand: { ...typography.display, color: t.textPrimary, marginBottom: spacing.xs },
    subtitle: { ...typography.body, color: t.textSecondary, marginBottom: spacing.xxl },
    form: { gap: spacing.md },
    input: {
      backgroundColor: t.foam,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      height: 50,
      ...typography.body,
      color: t.textPrimary,
    },
    switch: {
      ...typography.body,
      color: t.caramel,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });