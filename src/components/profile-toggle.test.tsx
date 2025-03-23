import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileToggle } from './profile-toggle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock the required hooks and modules
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock Radix UI components
vi.mock('./ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />
}));

describe('ProfileToggle', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('renders login option when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: false,
        currentUser: null,
        loading: false,
        error: null
      },
      logout: vi.fn(),
      login: vi.fn(),
      selectProfile: vi.fn(),
      resetAuthState: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('renders user information when authenticated', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      centerName: 'Test Center',
      batch: '2023'
    };

    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: mockUser,
        loading: false,
        error: null
      },
      logout: vi.fn(),
      login: vi.fn(),
      selectProfile: vi.fn(),
      resetAuthState: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);

    // Changed: Look for first name instead of initials
    expect(screen.getByText('John')).toBeInTheDocument(); // First name in avatar
    expect(screen.getByText(mockUser.name)).toBeInTheDocument(); // Full name in dropdown
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it('handles logout correctly', () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: { name: 'John Doe' },
        loading: false,
        error: null
      },
      logout: mockLogout,
      login: vi.fn(),
      selectProfile: vi.fn(),
      resetAuthState: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);
    
    const logoutButton = screen.getByText(/logout/i);
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
