import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FixedRecurrence = 'monthly' | 'weekly' | 'yearly';
export type FixedStatus = 'paid' | 'unpaid' | 'overdue';

// Fila de la vista v_fixed_expense_current: gasto fijo + estado del mes actual.
export type FixedExpenseCurrent = {
  fixed_expense_id: string;
  name: string;
  amount_cents: number;
  category_id: string | null;
  due_day: number | null;
  recurrence: FixedRecurrence;
  active: boolean;
  category_name: string | null;
  category_icon: string | null;
  payment_id: string | null;
  period: string | null;
  due_date: string | null;
  status: FixedStatus;
  transaction_id: string | null;
  paid_at: string | null;
};

// Un solo gasto fijo (para editar).
export type FixedExpense = {
  id: string;
  name: string;
  amount_cents: number;
  category_id: string | null;
  due_day: number | null;
  recurrence: FixedRecurrence;
  active: boolean;
};

// Lista de gastos fijos del mes en curso. Genera los períodos faltantes
// (y marca vencidos) antes de leer la vista.
export function useFixedExpensesCurrent() {
  return useQuery({
    queryKey: ['fixed_expenses', 'current'],
    queryFn: async (): Promise<FixedExpenseCurrent[]> => {
      const { error: rpcError } = await supabase.rpc('ensure_fixed_expense_periods');
      if (rpcError) throw rpcError;
      const { data, error } = await supabase
        .from('v_fixed_expense_current')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FixedExpenseCurrent[];
    },
  });
}

export function useFixedExpense(id: string | undefined) {
  return useQuery({
    queryKey: ['fixed_expense', id],
    enabled: !!id,
    queryFn: async (): Promise<FixedExpense> => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('id, name, amount_cents, category_id, due_day, recurrence, active')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as FixedExpense;
    },
  });
}

export type FixedExpenseInput = {
  name: string;
  amountCents: number;
  categoryId: string | null;
  dueDay: number | null;
  recurrence: FixedRecurrence;
};

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['fixed_expenses'] });
}

export function useCreateFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FixedExpenseInput): Promise<void> => {
      const { error } = await supabase.from('fixed_expenses').insert({
        name: input.name.trim(),
        amount_cents: input.amountCents,
        category_id: input.categoryId,
        due_day: input.dueDay,
        recurrence: input.recurrence,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FixedExpenseInput & { id: string }): Promise<void> => {
      const { error } = await supabase
        .from('fixed_expenses')
        .update({
          name: input.name.trim(),
          amount_cents: input.amountCents,
          category_id: input.categoryId,
          due_day: input.dueDay,
          recurrence: input.recurrence,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['fixed_expense', v.id] });
    },
  });
}

export function useDeleteFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

// Salda el gasto fijo del mes en curso: garantiza el período (lo crea si
// falta, para cualquier recurrencia) y crea el consumo enlazado. Recibe el
// fixed_expense_id —siempre disponible— para que "Pagar" nunca quede sin
// efecto por un payment_id nulo.
export function usePayFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fixedExpenseId: string;
      paymentMethodId?: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('pay_fixed_expense_current', {
        p_fixed_expense_id: input.fixedExpenseId,
        p_payment_method_id: input.paymentMethodId ?? null,
        p_occurred_at: null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['balance'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Revierte el saldado: borra el consumo y devuelve el período a pendiente.
export function useUnpayFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string): Promise<void> => {
      const { error } = await supabase.rpc('unpay_fixed_expense', {
        p_payment_id: paymentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['balance'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
