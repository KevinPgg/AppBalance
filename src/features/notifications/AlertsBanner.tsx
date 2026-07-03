import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';
import {
  type AppNotification,
  type NotificationKind,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/useNotifications';

const KIND_META: Record<string, { icon: string; color: string; bg: string }> = {
  budget_exceeded: { icon: '⚠️', color: colors.danger, bg: 'rgba(161,75,60,0.12)' },
  fixed_overdue: { icon: '⏰', color: colors.danger, bg: 'rgba(161,75,60,0.12)' },
  fixed_due: { icon: '📅', color: colors.warning, bg: 'rgba(201,138,75,0.12)' },
};

function metaFor(kind: NotificationKind) {
  return KIND_META[kind] ?? { icon: '🔔', color: colors.coffee, bg: colors.foam };
}

function routeFor(n: AppNotification): string | null {
  if (n.kind === 'budget_exceeded') return '/budgets';
  if (n.kind === 'fixed_overdue' || n.kind === 'fixed_due') return '/fixed';
  return null;
}

// Banner de avisos in-app en Inicio. No usa notificaciones push del SO:
// lee la tabla notifications (RPC refresh_notifications) y muestra los no leídos.
export function AlertsBanner() {
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = notifications.data ?? [];
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {items.map((n) => {
        const meta = metaFor(n.kind);
        const route = routeFor(n);
        return (
          <Pressable
            key={n.id}
            onPress={() => route && router.push(route as any)}
            style={[styles.item, { backgroundColor: meta.bg, borderColor: meta.color }]}
          >
            <Text style={styles.icon}>{meta.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: meta.color }]}>{n.title}</Text>
              {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
            </View>
            <Pressable onPress={() => markRead.mutate(n.id)} hitSlop={10}>
              <Text style={styles.dismiss}>✕</Text>
            </Pressable>
          </Pressable>
        );
      })}

      {items.length > 1 && (
        <Pressable onPress={() => markAll.mutate()} style={styles.clearAll} hitSlop={8}>
          <Text style={styles.clearAllText}>Descartar todo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: { fontSize: 20 },
  title: { ...typography.body, fontWeight: '700' },
  body: { ...typography.caption, color: colors.textPrimary, marginTop: 2 },
  dismiss: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.xs },
  clearAll: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  clearAllText: { ...typography.caption, color: colors.coffee, fontWeight: '600' },
});
