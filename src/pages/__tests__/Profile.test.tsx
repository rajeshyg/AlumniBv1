import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';
import { useAuth } from '../context/AuthContext';

// Mock the auth context
vi.mock('../context/AuthContext');

describe('Profile Page', () => {
  beforeEach(() => {
    // Set up mock user data
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        currentUser: {
          name: 'John Doe',
          email: 'john@example.com',
          centerName: 'Test Center',
          batch: '2023',
          studentId: 'ST123',
          role: 'alumni'
        },
        isAuthenticated: true,
        loading: false,
        error: null
      }
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
    vi.mocked(useAuth).mockReturnValue({
      authState: {
        currentUser: null,
        isAuthenticated: false,
        loading: true,
        error: null
      }
    });

    render(<Profile />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
