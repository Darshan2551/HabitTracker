import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
export type ThemePalette = 'ocean' | 'forest' | 'sunset';

type ThemeState = {
  mode: ThemeMode;
  palette: ThemePalette;
  accentColor: string;
  fontScale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  setTheme: (payload: Partial<Omit<ThemeState, 'setTheme' | 'applyTheme'>>) => void;
  applyTheme: () => void;
};

const paletteMap: Record<ThemePalette, { light: string; dark: string }> = {
  ocean: { light: '#0ea5e9', dark: '#38bdf8' },
  forest: { light: '#16a34a', dark: '#4ade80' },
  sunset: { light: '#f97316', dark: '#fb923c' },
};

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'SYSTEM') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode === 'DARK' ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'SYSTEM',
      palette: 'ocean',
      accentColor: '#0ea5e9',
      fontScale: 1,
      reduceMotion: false,
      highContrast: false,
      setTheme: (payload) => {
        set(payload as Partial<ThemeState>);
        get().applyTheme();
      },
      applyTheme: () => {
        const root = document.documentElement;
        const state = get();
        const resolved = resolveMode(state.mode);
        const palette = paletteMap[state.palette];
        const baseAccent = state.accentColor || (resolved === 'dark' ? palette.dark : palette.light);

        if (resolved === 'dark') {
          root.dataset.theme = 'dark';
          root.style.setProperty('--color-canvas', '#070b14');
          root.style.setProperty('--color-surface', '#101929');
          root.style.setProperty('--color-text', '#f8fafc');
          root.style.setProperty('--color-muted', '#94a3b8');
          root.style.setProperty('--color-border', '#1e293b');
        } else {
          root.dataset.theme = 'light';
          root.style.setProperty('--color-canvas', '#f0f9ff');
          root.style.setProperty('--color-surface', '#ffffff');
          root.style.setProperty('--color-text', '#0f172a');
          root.style.setProperty('--color-muted', '#475569');
          root.style.setProperty('--color-border', '#dbeafe');
        }

        root.style.setProperty('--color-accent', baseAccent);
        root.style.setProperty('--font-scale', String(state.fontScale));
        root.style.setProperty('--motion-reduce', state.reduceMotion ? '1' : '0');
        root.style.setProperty('--contrast-high', state.highContrast ? '1' : '0');
      },
    }),
    {
      name: 'habittracker-theme',
      partialize: (state) => ({
        mode: state.mode,
        palette: state.palette,
        accentColor: state.accentColor,
        fontScale: state.fontScale,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
      }),
    },
  ),
);
