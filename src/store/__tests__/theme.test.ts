import { renderHook, act } from '@testing-library/react';
import { useThemeStore } from '../theme';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('useThemeStore', () => {
  const mockClassList = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear persisted state
    localStorage.removeItem('theme-storage');
    // Mock classList methods
    Object.defineProperty(document.documentElement, 'classList', {
      value: mockClassList,
      writable: true
    });
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
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.theme).toBe('system');
    expect(mockClassList.add).toHaveBeenCalledWith('dark');
  });
});
