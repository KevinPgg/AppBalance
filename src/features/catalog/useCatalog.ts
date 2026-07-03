import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type PaymentMethodKind =
  | 'indefinido'
  | 'efectivo'
  | 'transferencia'
  | 'debito'
  | 'credito';

export type PaymentMethod = {
  id: string;
  kind: PaymentMethodKind;
  label: string | null;
};

export type TaxType = {
  id: string;
  name: string;
  kind: 'tax' | 'surcharge';
  default_rate: number | null;
  active: boolean;
};

export type AppSettings = {
  currency: string;
  iva_rate: number;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, color')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment_methods'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, kind, label');
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });
}

export function useTaxTypes() {
  return useQuery({
    queryKey: ['tax_types'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<TaxType[]> => {
      const { data, error } = await supabase
        .from('tax_types')
        .select('id, name, kind, default_rate, active')
        .eq('active', true);
      if (error) throw error;
      return (data ?? []) as TaxType[];
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('currency, iva_rate')
        .maybeSingle();
      if (error) throw error;
      return (data ?? { currency: 'USD', iva_rate: 0.15 }) as AppSettings;
    },
  });
}
