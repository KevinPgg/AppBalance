import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Adjustment } from '@/features/adjustments/balance';

export type AdjustmentInput = Adjustment & {
  label: string;
  rate?: number | null;
  tax_type_id?: string | null;
};

export type TxSource = 'manual' | 'loan';

export type NewTransaction = {
  type: 'expense' | 'income';
  subtotalCents: number;
  amountCents: number;
  occurredAt?: string; // ISO; por defecto now() en BD
  categoryId?: string | null;
  paymentMethodId?: string | null;
  merchant?: string | null;
  note?: string | null;
  incomeOrigin?: string | null;
  taxStatus: 'definido' | 'por_definir';
  source?: TxSource;
  adjustments?: AdjustmentInput[];
  tagIds?: string[];
};

function adjustmentsPayload(adjustments?: AdjustmentInput[]) {
  return (adjustments ?? []).map((a) => ({
    kind: a.kind,
    label: a.label,
    rate: a.rate ?? null,
    amount_cents: a.amount_cents,
    tax_type_id: a.tax_type_id ?? null,
  }));
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: NewTransaction): Promise<string> => {
      const { data, error } = await supabase.rpc('create_full_transaction', {
        p_type: tx.type,
        p_subtotal_cents: tx.subtotalCents,
        p_amount_cents: tx.amountCents,
        p_occurred_at: tx.occurredAt ?? null,
        p_category_id: tx.categoryId ?? null,
        p_payment_method_id: tx.paymentMethodId ?? null,
        p_merchant: tx.merchant ?? null,
        p_note: tx.note ?? null,
        p_income_origin: tx.incomeOrigin ?? null,
        p_tax_status: tx.taxStatus,
        p_source: tx.source ?? 'manual',
        p_adjustments: adjustmentsPayload(tx.adjustments),
        p_tag_ids: tx.tagIds ?? [],
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export type UpdateTransaction = NewTransaction & { id: string };

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: UpdateTransaction): Promise<string> => {
      const { data, error } = await supabase.rpc('update_full_transaction', {
        p_id: tx.id,
        p_subtotal_cents: tx.subtotalCents,
        p_amount_cents: tx.amountCents,
        p_occurred_at: tx.occurredAt ?? null,
        p_category_id: tx.categoryId ?? null,
        p_payment_method_id: tx.paymentMethodId ?? null,
        p_merchant: tx.merchant ?? null,
        p_note: tx.note ?? null,
        p_income_origin: tx.incomeOrigin ?? null,
        p_tax_status: tx.taxStatus,
        p_source: tx.source ?? 'manual',
        p_adjustments: adjustmentsPayload(tx.adjustments),
        p_tag_ids: tx.tagIds ?? [],
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, tx) => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', tx.id] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // El borrado cascada elimina ajustes y etiquetas; el trigger de cuadre
      // (deferred) no falla porque al commit la transacción ya no existe.
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
