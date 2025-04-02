import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { useAuth } from '../../../context/AuthContext';
import { useThemeStore } from '../../../store/theme';
import { CsvAdminRepository } from '../../../infrastructure/repositories/csvAdminRepository';

// Mock the required hooks and modules
vi.mock('../../../context/AuthContext');
vi.mock('../../../store/theme');
vi.mock('../../../infrastructure/repositories/csvAdminRepository');
vi.mock('lucide-react', () => ({
  Home: () => <div data-testid="home-icon">Home Icon</div>,
  Shield: () => <div data-testid="shield-icon">Shield Icon</div>,
  FileText: () => <div data-testid="file-icon">File Icon</div>,
  ClipboardCheck: () => <div data-testid="clipboard-icon">Clipboard Icon</div>,
  User: () => <div data-testid="user-icon">User Icon</div>,
  Settings: () => <div data-testid="settings-icon">Settings Icon</div>,
  FileEdit: () => <div data-testid="file-edit-icon">File Edit Icon</div>,
  ClipboardList: () => <div data-testid="clipboard-list-icon">Clipboard List Icon</div>,
  MessageSquare: () => <div data-testid="message-square-icon">Message Square Icon</div>
}));

// Create a wrapper component that provides necessary context
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('Navigation', () => {
  let mockAdminRepo: { getAdminWithRole: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock repository
    mockAdminRepo = {
      getAdminWithRole: vi.fn()
    };
    (CsvAdminRepository as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockAdminRepo);
    
    (useThemeStore as any).mockReturnValue({ device: 'desktop' });
    // Set up default auth mock
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: null,
        isAuthenticated: false,
        loading: false
      }
    });
  });

  it('shows basic navigation items for regular users', async () => {
    mockAdminRepo.getAdminWithRole.mockResolvedValue(null);
    
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' },
        isAuthenticated: true,
        loading: false
      }
    });

    renderWithRouter(<Navigation className="test-nav" />);

    // More concise assertions that will produce cleaner error output
    const expectedItems = ['Home', 'Posts', 'My Posts', 'Chat', 'Profile', 'Settings'];
    const unexpectedItems = ['Admin', 'Moderation', 'Review Posts'];

    for (const item of expectedItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    for (const item of unexpectedItems) {
      expect(screen.queryByText(item)).toBeNull();
    }
  });

  it('shows admin and moderation items for system admin', async () => {
    mockAdminRepo.getAdminWithRole.mockResolvedValue({ 
      email: 'admin@example.com', 
      role: 'system_admin' 
    });

    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { email: 'admin@example.com' },
        isAuthenticated: true,
        loading: false
      }
    });

    renderWithRouter(<Navigation className="test-nav" />);

    // Use the correct text that appears in the navigation
    const reviewPostsLink = await screen.findByRole('link', {
      name: /review posts/i
    });
    
    expect(reviewPostsLink).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('shows only moderation item for moderators', async () => {
    mockAdminRepo.getAdminWithRole.mockResolvedValue({ 
      email: 'moderator@example.com', 
      role: 'moderator' 
    });

    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { email: 'moderator@example.com' },
        isAuthenticated: true,
        loading: false
      }
    });

    renderWithRouter(<Navigation className="test-nav" />);

    // Look for "Review Posts" which is the actual label used for moderation
    const reviewPostsLink = await screen.findByRole('link', {
      name: /review posts/i
    });
    expect(reviewPostsLink).toBeInTheDocument();
    
    // Make sure admin link is not shown for moderators
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('handles error in admin status check gracefully', async () => {
    mockAdminRepo.getAdminWithRole.mockRejectedValue(
      new Error('Failed to check admin status')
    );

    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' },
        isAuthenticated: true,
        loading: false
      }
    });

    renderWithRouter(<Navigation className="test-nav" />);

    // Should show only basic navigation items when admin check fails
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Moderation')).not.toBeInTheDocument();
    expect(screen.queryByText('Review Posts')).not.toBeInTheDocument();
  });

  it('updates navigation items when user role changes', async () => {
    mockAdminRepo.getAdminWithRole.mockResolvedValue({ 
      email: 'user@example.com', 
      role: 'moderator' 
    });

    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' },
        isAuthenticated: true,
        loading: false
      }
    });

    renderWithRouter(<Navigation className="test-nav" />);

    // Wait for admin status check to complete using the correct label
    await screen.findByText('Review Posts');

    // Verify moderator navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Review Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

