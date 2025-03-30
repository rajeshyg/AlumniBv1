import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TabNavigation } from '../TabNavigation';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '../../../utils/logger';

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the logger to prevent console output during tests
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('TabNavigation', () => {
  const mockUser = {
    studentId: "10008",
    name: "Test User",
    email: "test@example.com"
  };

  const testTabs = [
    { label: 'Home', value: '/home' },
    { label: 'Posts', value: '/posts' },
    { label: 'Profile', value: '/profile' }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: mockUser,
        isAuthenticated: true,
        loading: false
      }
    });
  });

  it('renders all tabs correctly', () => {
    render(
      <BrowserRouter>
        <TabNavigation 
          tabs={testTabs} 
          onTabChange={() => {}}
        />
      </BrowserRouter>
    );

    testTabs.forEach(tab => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('highlights the active tab based on current path', () => {
    render(
      <BrowserRouter>
        <TabNavigation 
          tabs={testTabs} 
          activeTab="/posts"
          onTabChange={() => {}} 
        />
      </BrowserRouter>
    );

    const activeTab = screen.getByTestId('tab-posts');
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onClick handler when tab is clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <BrowserRouter>
        <TabNavigation 
          tabs={testTabs} 
          onTabChange={handleClick}
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Posts'));
    expect(handleClick).toHaveBeenCalledWith('/posts');
  });

  it('shows moderator tab only for moderator users', () => {
    // Mock user as moderator
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { ...mockUser, role: 'moderator' },
        isAuthenticated: true,
        loading: false
      }
    });

    const tabsWithModeration = [
      ...testTabs,
      { label: 'Moderation', value: '/moderation' }
    ];

    render(
      <BrowserRouter>
        <TabNavigation tabs={tabsWithModeration} />
      </BrowserRouter>
    );

    expect(screen.getByText('Moderation')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    // Mock user as loading
    (useAuth as any).mockReturnValue({
      authState: {
        loading: true,
        currentUser: null,
        isAuthenticated: false
      }
    });

    render(
      <BrowserRouter>
        <TabNavigation 
          tabs={testTabs} 
          activeTab="home"
          onTabChange={() => {}} 
        />
      </BrowserRouter>
    );

    // Test for disabled buttons during loading state
    const loadingTabs = screen.getAllByRole('tab');
    expect(loadingTabs.length).toBeGreaterThan(0);
    loadingTabs.forEach(tab => {
      expect(tab).toBeDisabled();
      expect(tab).toHaveClass('opacity-50');
    });
  });

  it('handles unauthenticated state correctly', () => {
    // Mock unauthenticated state
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: null,
        isAuthenticated: false,
        loading: false
      }
    });

    const publicTabs = [
      { label: 'Home', value: '/home' },
      { label: 'Login', value: '/login' }
    ];

    render(
      <BrowserRouter>
        <TabNavigation tabs={publicTabs} />
      </BrowserRouter>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });
});
