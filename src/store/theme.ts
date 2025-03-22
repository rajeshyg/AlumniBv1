import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  device: 'mobile' | 'desktop';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDevice: (device: 'mobile' | 'desktop') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      device: 'desktop',
      setTheme: (theme) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
        
        set({ theme });
      },
      setDevice: (device) => set({ device }),
    }),
    {
      name: 'theme-storage',
    }
  )
);