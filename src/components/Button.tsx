import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { radius, spacing, typography } from '@/theme/typography';
import { useTheme } from '@/store/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.textOnDark : theme.coffee} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      height: 50,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    primary: { backgroundColor: t.coffee },
    secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.coffee },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    text: { ...typography.subtitle },
    textPrimary: { color: t.textOnDark },
    textSecondary: { color: t.caramel },
  });
