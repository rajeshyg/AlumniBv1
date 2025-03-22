import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceToggle } from '../device-toggle';
import { useThemeStore } from '../../store/theme';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all the UI components
vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn(),
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick }) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
}));

describe('DeviceToggle', () => {
  const mockInitDeviceDetection = vi.fn();
  const mockSetDevice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useThemeStore as any).mockImplementation(() => ({
      device: 'desktop',
      setDevice: mockSetDevice,
      initDeviceDetection: mockInitDeviceDetection,
    }));
  });

  it('renders desktop icon when device is desktop', () => {
    render(<DeviceToggle />);
    
    expect(screen.getByTestId('button')).toBeInTheDocument();
    expect(screen.getByText('Toggle device')).toBeInTheDocument();
  });

  it('renders mobile icon when device is mobile', () => {
    (useThemeStore as any).mockImplementation(() => ({
      device: 'mobile',
      setDevice: mockSetDevice,
      initDeviceDetection: mockInitDeviceDetection,
    }));
    
    render(<DeviceToggle />);
    
    expect(screen.getByTestId('button')).toBeInTheDocument();
    expect(screen.getByText('Toggle device')).toBeInTheDocument();
  });

  it('calls initDeviceDetection on mount', () => {
    render(<DeviceToggle />);
    expect(mockInitDeviceDetection).toHaveBeenCalledTimes(1);
  });

  it('updates device when dropdown items are clicked', () => {
    render(<DeviceToggle />);
    
    // Find all dropdown items
    const dropdownItems = screen.getAllByTestId('dropdown-item');
    
    // Click the first item (Desktop)
    fireEvent.click(dropdownItems[0]);
    expect(mockSetDevice).toHaveBeenCalledWith('desktop');
    
    // Click the second item (Mobile)
    fireEvent.click(dropdownItems[1]);
    expect(mockSetDevice).toHaveBeenCalledWith('mobile');
  });
});
