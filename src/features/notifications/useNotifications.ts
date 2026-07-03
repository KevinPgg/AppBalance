import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type NotificationKind = 'budget_exceeded' | 'fixed_overdue' | 'fixed_due' | string;

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  payload: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
};

// Refresca los avisos (RPC) y devuelve los no leídos. La app la usa en Inicio.
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async (): Promise<AppNotification[]> => {
      const { error: rpcError } = await supabase.rpc('refresh_notifications');
      if (rpcError) throw rpcError;
      const { data, error } = await supabase
        .from('notifications')
        .select('id, kind, title, body, payload, read_at, created_at')
        .is('read_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
