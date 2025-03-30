import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';
import { useAuth } from '../../context/AuthContext';
import { User, AuthState } from '../../models/User';

// Mock the auth context
vi.mock('../../context/AuthContext');

describe('Profile Page', () => {
  beforeEach(() => {
    // Set up mock user data
    const mockUser: Partial<User> = {
      name: 'John Doe',
      email: 'john@example.com',
      centerName: 'Test Center',
      batch: '2023',
      studentId: 'ST123'
      // role is not in User type, removed it
    };
    
    const mockAuthState: AuthState = {
      currentUser: mockUser as User,
      isAuthenticated: true,
      loading: false,
      error: null,
      awaitingProfileSelection: false
    };
    
    vi.mocked(useAuth).mockReturnValue({
      authState: mockAuthState,
      login: vi.fn().mockResolvedValue({ success: true }),
      selectProfile: vi.fn(),
      logout: vi.fn()
    });
  });

  it('renders user profile information', () => {
    render(<Profile />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Center')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('ST123')).toBeInTheDocument();
  });

  it('shows edit button when user views own profile', () => {
    render(<Profile />);
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('shows loading state when auth is loading', () => {
    const loadingAuthState: AuthState = {
      currentUser: null,
      isAuthenticated: false,
      loading: true,
      error: null,
      awaitingProfileSelection: false
    };
    
    vi.mocked(useAuth).mockReturnValue({
      authState: loadingAuthState,
      login: vi.fn().mockResolvedValue({ success: true }),
      selectProfile: vi.fn(),
      logout: vi.fn()
    });

    render(<Profile />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
