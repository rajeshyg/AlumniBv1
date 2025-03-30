import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom';
import { ProfileToggle } from '../profile-toggle';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/UserService';
import { User, AuthState } from '../../models/User';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock only the static methods of UserService that are used directly by ProfileToggle (if any)
// In this case, logout is called via useAuth, so we mainly mock AuthContext
vi.mock('../../services/UserService', () => ({
  UserService: {
    // Mock static methods if directly called by ProfileToggle, otherwise mock via useAuth
    logout: vi.fn(),
    // We don't need getAvailableProfiles here, it's handled in AuthContext
  }
}));

describe('ProfileToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  
  const mockMultiProfileUserList: User[] = [
    { studentId: 'p1', name: 'Profile One', email: 'multi@example.com' },
    { studentId: 'p2', name: 'Profile Two', email: 'multi@example.com' },
  ];

  // Updated mock AuthState for awaiting profile selection
  const awaitingAuthState: AuthState & { availableProfiles?: User[] } = {
    isAuthenticated: true, // User is authenticated but needs to select profile
    currentUser: null,
    loading: false,
    error: null,
    awaitingProfileSelection: true,
    availableProfiles: mockMultiProfileUserList, // Pass profiles via authState
  };

  it('renders user name and email when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ authState: mockAuthState, login: vi.fn(), selectProfile: vi.fn(), logout: vi.fn() });
    
    render(<Router><ProfileToggle /></Router>);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const loadingAuthState = { ...mockAuthState, loading: true, currentUser: null, awaitingProfileSelection: false };
    vi.mocked(useAuth).mockReturnValue({ authState: loadingAuthState, login: vi.fn(), selectProfile: vi.fn(), logout: vi.fn() });

    render(<Router><ProfileToggle /></Router>);
    // Assuming the component renders a loading indicator
    // Update this assertion based on your actual loading indicator text/element
    // For now, let's check if the toggle button is absent during loading
    expect(screen.queryByRole('button', { name: /user menu/i })).not.toBeInTheDocument();
  });

  it('calls logout and navigates to /login on logout click', () => {
    const mockLogout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ authState: mockAuthState, login: vi.fn(), selectProfile: vi.fn(), logout: mockLogout });

    render(<Router><ProfileToggle /></Router>);
    
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Log out/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders multiple profiles when awaiting selection', async () => {
    // Provide the state with availableProfiles directly
    vi.mocked(useAuth).mockReturnValue({ authState: awaitingAuthState, login: vi.fn(), selectProfile: vi.fn(), logout: vi.fn() });

    render(<Router><ProfileToggle /></Router>);

    // Open the dropdown first
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));

    // Check if profile names are now visible in the dropdown
    expect(await screen.findByText('Select Profile')).toBeInTheDocument();
    expect(screen.getByText('Profile One')).toBeInTheDocument();
    expect(screen.getByText('Profile Two')).toBeInTheDocument();
  });

  it('calls selectProfile when a profile is chosen', async () => {
    const mockSelectProfile = vi.fn();
    // Provide the state with availableProfiles directly
    vi.mocked(useAuth).mockReturnValue({ authState: awaitingAuthState, login: vi.fn(), selectProfile: mockSelectProfile, logout: vi.fn() });

    render(<Router><ProfileToggle /></Router>);
    
    // Open the dropdown first
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    
    // Wait for profiles to load and click one
    const profileOneItem = await screen.findByRole('menuitem', { name: /Profile One/i });
    fireEvent.click(profileOneItem);
    
    // Expect selectProfile to be called with the chosen profile data
    expect(mockSelectProfile).toHaveBeenCalledWith(mockMultiProfileUserList[0]);
  });
});
