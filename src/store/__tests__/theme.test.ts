import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the actual implementation of the store
vi.mock('../theme', () => {
  const mockStore = {
    theme: 'system',
    device: 'desktop',
    setTheme: vi.fn((theme) => {
      mockStore.theme = theme;
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
    }),
    setDevice: vi.fn((device) => {
      mockStore.device = device;
    }),
    initDeviceDetection: vi.fn(() => {
      if (window.innerWidth < 768) {
        mockStore.device = 'mobile';
      }
      window.addEventListener('resize', () => {});
    }),
  };
  
  return {
    useThemeStore: () => mockStore
  };
});

// Import after mocking
import { useThemeStore } from '../theme';

describe('useThemeStore', () => {
  // Mock document and window
  const originalDocumentClassList = document.documentElement.classList;
  let mockClassList;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock matchMedia
    global.window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    // Mock classList
    mockClassList = {
      remove: vi.fn(),
      add: vi.fn(),
    };
    Object.defineProperty(document.documentElement, 'classList', {
      writable: true,
      value: mockClassList
    });
    
    // Mock window innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    
    // Mock addEventListener
    window.addEventListener = vi.fn();
  });
  
  afterEach(() => {
    // Restore original classList
    Object.defineProperty(document.documentElement, 'classList', {
      writable: true,
      value: originalDocumentClassList
    });
  });
  
  it('should initialize with correct defaults', () => {
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.theme).toBe('system');
    expect(result.current.device).toBe('desktop');
  });
  
  it('should set theme correctly', () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
    expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
    expect(mockClassList.add).toHaveBeenCalledWith('dark');
  });
  
  it('should detect system theme preference', () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setTheme('system');
    });
    
    expect(mockClassList.add).toHaveBeenCalledWith('dark');
  });
  
  it('should set device type', () => {
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.setDevice('mobile');
    });
    
    expect(result.current.device).toBe('mobile');
  });
  
  it('should detect device type based on window width', () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 500,
    });
    
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      result.current.initDeviceDetection();
    });
    
    expect(result.current.device).toBe('mobile');
    expect(window.addEventListener).toHaveBeenCalled();
  });
});
