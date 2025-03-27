import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileToggle } from './profile-toggle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserService } from '../services/UserService';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../services/UserService', () => ({
  UserService: {
    login: vi.fn()
  }
}));

// Mock Radix UI components
vi.mock('./ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  )
}));

describe('ProfileToggle', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('should display user first name when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        loading: false,
        error: null
      },
      logout: vi.fn()
    });

    render(<ProfileToggle />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should display "U" when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: false,
        currentUser: null,
        loading: false,
        error: null
      },
      logout: vi.fn()
    });

    render(<ProfileToggle />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('should handle logout correctly', () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: { name: 'John Doe' },
        loading: false,
        error: null
      },
      logout: mockLogout
    });

    render(<ProfileToggle />);
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle profile switching correctly', async () => {
    const mockUser = { name: 'John Doe', email: 'john@example.com' };
    const mockProfiles = [mockUser];
    const mockLogout = vi.fn();
    
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: mockUser,
        loading: false,
        error: null
      },
      logout: mockLogout
    });

    // Setup the mock to resolve immediately
    const loginMock = vi.mocked(UserService.login);
    loginMock.mockResolvedValueOnce({
      success: true,
      users: mockProfiles
    });

    render(<ProfileToggle />);
    
    // Find and click the switch profile button using the text content
    const switchButton = screen.getByText('Switch Profile').closest('button');
    if (!switchButton) throw new Error('Switch Profile button not found');
    await fireEvent.click(switchButton);

    // Wait for async operations to complete
    await vi.waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(mockUser.email, 'test');
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          switchProfile: true,
          profiles: mockProfiles,
          email: mockUser.email
        }
      });
    });
  });

  it('should return null when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: false,
        currentUser: null,
        loading: true,
        error: null
      },
      logout: vi.fn()
    });

    const { container } = render(<ProfileToggle />);
    expect(container.firstChild).toBeNull();
  });
});
