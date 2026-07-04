import { View, StyleSheet, ViewProps } from 'react-native';
import { radius, spacing } from '@/theme/typography';
import { useThemedStyles } from '@/theme/useThemedStyles';
import type { Theme } from '@/theme/themes';

export function Card({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]} {...props} />;
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.foam,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.espresso,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
  });
