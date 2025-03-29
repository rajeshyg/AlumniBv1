import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { useAuth } from '../../../context/AuthContext';
import { CsvAdminRepository } from '../../../infrastructure/repositories/csvAdminRepository';
import { vi } from 'vitest';

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the admin repository
vi.mock('../../../infrastructure/repositories/csvAdminRepository', () => ({
  CsvAdminRepository: vi.fn()
}));

describe('Navigation', () => {
  const mockGetAdminWithRole = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (CsvAdminRepository as jest.Mock).mockImplementation(() => ({
      getAdminWithRole: mockGetAdminWithRole
    }));
  });

  it('shows basic navigation items for regular users', () => {
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' }
      }
    });

    mockGetAdminWithRole.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows admin and review items for system admin', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'admin@example.com' }
      }
    });

    mockGetAdminWithRole.mockResolvedValue({
      role: 'system_admin'
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Wait for admin status check to complete
    await screen.findByText('Admin');
    await screen.findByText('Review Posts');

    // Verify admin navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Review Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows only review item for moderators', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'moderator@example.com' }
      }
    });

    mockGetAdminWithRole.mockResolvedValue({
      role: 'moderator'
    });

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Wait for admin status check to complete
    await screen.findByText('Review Posts');

    // Verify moderator navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Review Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('handles error in admin status check gracefully', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' }
      }
    });

    mockGetAdminWithRole.mockRejectedValue(new Error('Failed to check admin status'));

    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Should still show basic navigation items even if admin check fails
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('updates navigation items when user role changes', async () => {
    const { rerender } = render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Initial state - regular user
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' }
      }
    });
    mockGetAdminWithRole.mockResolvedValue(null);
    rerender(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Change to moderator
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        currentUser: { email: 'user@example.com' }
      }
    });
    mockGetAdminWithRole.mockResolvedValue({
      role: 'moderator'
    });
    rerender(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // Wait for admin status check to complete
    await screen.findByText('Review Posts');

    // Verify moderator navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('My Posts')).toBeInTheDocument();
    expect(screen.getByText('Review Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
}); 