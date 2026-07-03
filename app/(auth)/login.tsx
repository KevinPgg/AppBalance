import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import { useAuth } from '@/store/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);

  async function onSubmit() {
    if (!email.includes('@')) {
      Alert.alert('Email inválido', 'Escribe un correo válido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'Usa al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Error', error);
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
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colors.textSecondary}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { ...typography.display, color: colors.espresso, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xxl },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.foam,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...typography.body,
    color: colors.textPrimary,
  },
  switch: {
    ...typography.body,
    color: colors.coffee,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
