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
    document.documentElement.classList = mockClassList as any;
  });

  it('should set theme correctly', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(mockClassList.remove).toHaveBeenCalledWith('light');
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
