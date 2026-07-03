import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PaymentMethodKind } from './useCatalog';

// Cambia la tasa global de IVA y la sincroniza con el tax_type 'IVA'
// (vía RPC para que ambos cambios ocurran juntos).
export function useSetIvaRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: number): Promise<void> => {
      const { error } = await supabase.rpc('set_iva_rate', { p_rate: rate });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app_settings'] });
      qc.invalidateQueries({ queryKey: ['tax_types'] });
    },
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: PaymentMethodKind; label: string }): Promise<void> => {
      const { error } = await supabase
        .from('payment_methods')
        .insert({ kind: input.kind, label: input.label.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment_methods'] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; label: string }): Promise<void> => {
      const { error } = await supabase
        .from('payment_methods')
        .update({ label: input.label.trim() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment_methods'] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_methods'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ---- Categorías ----
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      icon: string | null;
      color?: string | null;
    }): Promise<void> => {
      const { error } = await supabase.from('categories').insert({
        name: input.name.trim(),
        icon: input.icon,
        color: input.color ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      icon: string | null;
    }): Promise<void> => {
      const { error } = await supabase
        .from('categories')
        .update({ name: input.name.trim(), icon: input.icon })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Los consumos que la usaban quedan con category_id = null (FK on delete set null).
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
