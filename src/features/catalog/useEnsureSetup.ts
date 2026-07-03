import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

// Siembra el catálogo base (categorías, medios de pago, IVA) la primera vez
// que el usuario entra. Idempotente en BD: llamarla de más no duplica nada.
export function useEnsureSetup() {
  const session = useAuth((s) => s.session);
  const queryClient = useQueryClient();
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || seededFor.current === userId) return;
    seededFor.current = userId;

    (async () => {
      const { error } = await supabase.rpc('seed_user_defaults');
      if (error) {
        // No bloquea la app; reintentará en el próximo arranque.
        seededFor.current = null;
        console.warn('[seed] no se pudo sembrar el catálogo base:', error.message);
        return;
      }
      // Refrescar catálogos recién creados.
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['payment_methods'] });
      queryClient.invalidateQueries({ queryKey: ['tax_types'] });
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
    })();
  }, [session?.user?.id, queryClient]);
}
