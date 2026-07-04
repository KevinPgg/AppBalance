import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  THEMES,
  THEME_LABELS,
  themeKey,
  DEFAULT_FAMILY,
  DEFAULT_MODE,
  type Theme,
  type ThemeFamily,
  type ThemeMode,
} from '@/theme/themes';

const STORAGE_KEY = 'cl-theme';

type ThemeState = {
  family: ThemeFamily;
  mode: ThemeMode;
  hydrated: boolean;
  // Carga el tema guardado (una vez, al arrancar). No parpadea porque
  // hydrated arranca en false y las pantallas usan el default hasta cargar.
  hydrate: () => Promise<void>;
  setFamily: (family: ThemeFamily) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

function persist(family: ThemeFamily, mode: ThemeMode) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ family, mode })).catch(() => {});
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  family: DEFAULT_FAMILY,
  mode: DEFAULT_MODE,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const family: ThemeFamily = saved?.family === 'cherry' ? 'cherry' : 'cafe';
        const mode: ThemeMode = saved?.mode === 'dark' ? 'dark' : 'light';
        set({ family, mode, hydrated: true });
        return;
      }
    } catch {
      // ignora storage corrupto y cae al default
    }
    set({ hydrated: true });
  },
  setFamily: (family) => {
    set({ family });
    persist(family, get().mode);
  },
  setMode: (mode) => {
    set({ mode });
    persist(get().family, mode);
  },
  toggleMode: () => {
    const mode = get().mode === 'dark' ? 'light' : 'dark';
    set({ mode });
    persist(get().family, mode);
  },
}));

// Hook principal: devuelve la paleta activa (objeto Theme con tokens + alias).
export function useTheme(): Theme {
  const family = useThemeStore((s) => s.family);
  const mode = useThemeStore((s) => s.mode);
  return THEMES[themeKey(family, mode)];
}

// Etiqueta visible del tema activo (ej. 'Latte', 'Dark Cherry').
export function useThemeLabel(): string {
  const family = useThemeStore((s) => s.family);
  const mode = useThemeStore((s) => s.mode);
  return THEME_LABELS[family][mode];
}
