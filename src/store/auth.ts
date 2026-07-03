import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  initializing: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, initializing: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },
  signIn: async (email: string, password: string) => {
    // Email + contraseña. App personal: un solo usuario. Sin links.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  },
  signUp: async (email: string, password: string) => {
    // Primer arranque: crea la cuenta. Si "Confirm email" está apagado en
    // Supabase, inicia sesión de inmediato sin enviar ningún correo.
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
