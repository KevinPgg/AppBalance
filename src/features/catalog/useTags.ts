import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Tag = {
  id: string;
  name: string;
  color: string | null;
};

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string | null }): Promise<Tag> => {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: input.name.trim(), color: input.color ?? null })
        .select('id, name, color')
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
