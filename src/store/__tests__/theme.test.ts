import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemeStore } from '../theme';

describe('useThemeStore', () => {
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    document.documentElement.classList = mockClassList as any;
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    expect(result.current.theme).toBe('system');
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
    const { result } = renderHook(() => useThemeStore());
    
    act(() => {
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.device).toBe('mobile');
  });
});
