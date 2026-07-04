import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tx } from '@/components/TxRow';

// Saldo actual desde la vista v_user_balance.
export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('v_user_balance')
        .select('balance_cents')
        .maybeSingle();
      if (error) throw error;
      return data?.balance_cents ?? 0;
    },
  });
}

export type MonthSummary = { spentCents: number; incomeCents: number };

// Gastado e ingresos del MES en curso (para las pills del hero).
// RLS limita las filas al usuario actual; se suma en cliente.
export function useMonthSummary() {
  return useQuery({
    queryKey: ['month-summary'],
    queryFn: async (): Promise<MonthSummary> => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_cents')
        .gte('occurred_at', start);
      if (error) throw error;
      let spentCents = 0;
      let incomeCents = 0;
      for (const r of (data ?? []) as { type: string; amount_cents: number }[]) {
        if (r.type === 'expense') spentCents += r.amount_cents;
        else incomeCents += r.amount_cents;
      }
      return { spentCents, incomeCents };
    },
  });
}

export type TransactionDetail = {
  id: string;
  type: 'expense' | 'income';
  subtotal_cents: number;
  amount_cents: number;
  occurred_at: string;
  category_id: string | null;
  payment_method_id: string | null;
  merchant: string | null;
  note: string | null;
  income_origin: string | null;
  source: string;
  tax_status: 'definido' | 'por_definir';
  adjustments: {
    id: string;
    kind: 'tax' | 'surcharge' | 'discount';
    label: string;
    rate: number | null;
    amount_cents: number;
    tax_type_id: string | null;
  }[];
  tag_ids: string[];
};

// Una transacción con su desglose y etiquetas (para ver/editar).
export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    enabled: !!id,
    queryFn: async (): Promise<TransactionDetail> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          `id, type, subtotal_cents, amount_cents, occurred_at, category_id,
           payment_method_id, merchant, note, income_origin, source, tax_status,
           transaction_adjustments ( id, kind, label, rate, amount_cents, tax_type_id ),
           transaction_tags ( tag_id )`,
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      const row = data as any;
      return {
        id: row.id,
        type: row.type,
        subtotal_cents: row.subtotal_cents,
        amount_cents: row.amount_cents,
        occurred_at: row.occurred_at,
        category_id: row.category_id,
        payment_method_id: row.payment_method_id,
        merchant: row.merchant,
        note: row.note,
        income_origin: row.income_origin,
        source: row.source,
        tax_status: row.tax_status,
        adjustments: row.transaction_adjustments ?? [],
        tag_ids: (row.transaction_tags ?? []).map((t: any) => t.tag_id),
      };
    },
  });
}

// Últimos consumos / ingresos.
export function useRecentTransactions(limit = 20) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: async (): Promise<Tx[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, amount_cents, merchant, occurred_at, tax_status')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Tx[];
    },
  });
}
