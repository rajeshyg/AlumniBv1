import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DeviceType = 'desktop' | 'mobile';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  device: DeviceType;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDevice: (device: DeviceType) => void;
  initDeviceDetection: () => void;
}

// Helper function to detect device type based on screen width
const detectDeviceType = (): DeviceType => {
  // Check if window exists (to avoid SSR issues)
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }
  return 'desktop'; // Default fallback
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      device: detectDeviceType(), // Initialize with detected device
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
      initDeviceDetection: () => {
        // Set initial device type
        set({ device: detectDeviceType() });
        
        // Add window resize listener
        if (typeof window !== 'undefined') {
          const handleResize = () => {
            set({ device: detectDeviceType() });
          };
          
          window.addEventListener('resize', handleResize);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);