import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  it('renders login option when not authenticated', async () => {
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
      switchProfile: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    await fireEvent.click(trigger);

    const dropdownContent = await screen.findByTestId('dropdown-content');
    expect(dropdownContent).toBeVisible();
    expect(await screen.findByText(/login/i)).toBeInTheDocument();
  });

  it('renders user information when authenticated', async () => {
    const mockUser = {
      studentId: '123',
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
      switchProfile: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    await fireEvent.click(trigger);

    const dropdownContent = await screen.findByTestId('dropdown-content');
    expect(dropdownContent).toBeVisible();
    expect(await screen.findByText('Switch Profile')).toBeInTheDocument();
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
  });

  it('handles logout correctly', async () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: { studentId: '123', name: 'John Doe', email: 'john@example.com' },
        loading: false,
        error: null
      },
      logout: mockLogout,
      login: vi.fn(),
      selectProfile: vi.fn(),
      switchProfile: vi.fn()
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    await fireEvent.click(trigger);

    const dropdownContent = await screen.findByTestId('dropdown-content');
    expect(dropdownContent).toBeVisible();
    const logoutButton = await screen.findByText(/logout/i);
    await fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles switch profile correctly', () => {
    const mockSwitchProfile = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: { studentId: '123', name: 'John Doe', email: 'john@example.com' },
        loading: false,
        error: null
      },
      logout: vi.fn(),
      login: vi.fn(),
      selectProfile: vi.fn(),
      switchProfile: mockSwitchProfile
    });

    render(<ProfileToggle />);
    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);

    const switchProfileButton = screen.getByText(/switch profile/i);
    fireEvent.click(switchProfileButton);

    expect(mockSwitchProfile).toHaveBeenCalledWith({
      keepEmail: true,
      redirectToLogin: true
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
