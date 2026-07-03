import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type BudgetScope = 'global' | 'category' | 'tag';
export type BudgetPeriod = 'weekly' | 'monthly';

// Fila de v_budget_status: presupuesto + gasto del período en curso.
export type BudgetStatus = {
  budget_id: string;
  name: string | null;
  scope: BudgetScope;
  category_id: string | null;
  tag_id: string | null;
  limit_cents: number;
  period: BudgetPeriod;
  category_name: string | null;
  category_icon: string | null;
  tag_name: string | null;
  period_start: string;
  spent_cents: number;
};

export type Budget = {
  id: string;
  name: string | null;
  scope: BudgetScope;
  category_id: string | null;
  tag_id: string | null;
  limit_cents: number;
  period: BudgetPeriod;
  active: boolean;
};

export function useBudgetsStatus() {
  return useQuery({
    queryKey: ['budgets', 'status'],
    queryFn: async (): Promise<BudgetStatus[]> => {
      const { data, error } = await supabase
        .from('v_budget_status')
        .select('*')
        .order('name', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as BudgetStatus[];
    },
  });
}

export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: ['budget', id],
    enabled: !!id,
    queryFn: async (): Promise<Budget> => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, name, scope, category_id, tag_id, limit_cents, period, active')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Budget;
    },
  });
}

export type BudgetInput = {
  name: string | null;
  scope: BudgetScope;
  categoryId: string | null;
  tagId: string | null;
  limitCents: number;
  period: BudgetPeriod;
};

function toRow(input: BudgetInput) {
  return {
    name: input.name?.trim() || null,
    scope: input.scope,
    category_id: input.scope === 'category' ? input.categoryId : null,
    tag_id: input.scope === 'tag' ? input.tagId : null,
    limit_cents: input.limitCents,
    period: input.period,
  };
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['budgets'] });
  qc.invalidateQueries({ queryKey: ['notifications'] });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BudgetInput): Promise<void> => {
      const { error } = await supabase.from('budgets').insert(toRow(input));
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BudgetInput & { id: string }): Promise<void> => {
      const { error } = await supabase.from('budgets').update(toRow(input)).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['budget', v.id] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
