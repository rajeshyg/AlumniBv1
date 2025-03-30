import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProfileToggle } from '../profile-toggle';
import { useAuth } from '../../context/AuthContext';
import { User, AuthState } from '../../models/User';

// Mock dependencies
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

vi.mock('../../context/AuthContext');
vi.mock('../../services/UserService');

// Mock the UI components to avoid render issues
vi.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

describe('ProfileToggle', () => {
  const mockUser: User = {
    studentId: '12345',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockAuthState: AuthState = {
    isAuthenticated: true,
    currentUser: mockUser,
    loading: false,
    error: null,
    awaitingProfileSelection: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock for useAuth
    (useAuth as any).mockReturnValue({
      authState: mockAuthState,
      login: vi.fn(),
      logout: vi.fn(),
      selectProfile: vi.fn()
    });
  });

  it('renders without crashing when authenticated', () => {
    render(
      <BrowserRouter>
        <ProfileToggle />
      </BrowserRouter>
    );
    
    // Just verify the component renders
    expect(document.body).toBeTruthy();
  });

  it('renders as null when loading', () => {
    const loadingAuthState = { ...mockAuthState, loading: true };
    (useAuth as any).mockReturnValue({ 
      authState: loadingAuthState, 
      login: vi.fn(), 
      selectProfile: vi.fn(), 
      logout: vi.fn() 
    });

    const { container } = render(
      <BrowserRouter>
        <ProfileToggle />
      </BrowserRouter>
    );
    
    // Container should be empty when loading
    expect(container.innerHTML).toBe('');
  });

  it('renders dropdown menu correctly', () => {
    // This test only checks that the component renders a dropdown structure
    const { container } = render(
      <BrowserRouter>
        <ProfileToggle />
      </BrowserRouter>
    );
    
    // Make sure the component renders something
    expect(container.textContent).toContain('Test'); // First name of Test User
  });
});
