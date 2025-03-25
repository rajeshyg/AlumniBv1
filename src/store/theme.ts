import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../utils/logger';

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
    const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
    logger.debug('Detected device type', { 
      width: window.innerWidth, 
      deviceType 
    });
    return deviceType;
  }
  logger.debug('Window not available, defaulting to desktop');
  return 'desktop'; // Default fallback
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      device: detectDeviceType(), // Initialize with detected device
      setTheme: (theme) => {
        logger.info('Setting theme', { theme });
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          logger.debug('System theme detected', { systemTheme });
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
        
        set({ theme });
      },
      setDevice: (device) => {
        logger.debug('Setting device type', { device });
        set({ device });
      },
      initDeviceDetection: () => {
        // Set initial device type
        const initialDevice = detectDeviceType();
        logger.info('Initializing device detection', { initialDevice });
        set({ device: initialDevice });
        
        // Add window resize listener
        if (typeof window !== 'undefined') {
          const handleResize = () => {
            const newDevice = detectDeviceType();
            logger.debug('Window resized', { 
              width: window.innerWidth, 
              height: window.innerHeight,
              newDevice 
            });
            set({ device: newDevice });
          };
          
          window.addEventListener('resize', handleResize);
          logger.debug('Added resize event listener');
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);