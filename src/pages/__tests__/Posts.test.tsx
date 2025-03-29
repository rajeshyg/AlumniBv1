import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Posts from '../Posts';
import { PostService } from '../../services/PostService';
import { useAuth } from '../../context/AuthContext';
import { vi } from 'vitest';

// Mock the auth context
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock PostService
vi.mock('../../services/PostService', () => ({
  PostService: {
    getAllPosts: vi.fn(),
    createPost: vi.fn(),
    likePost: vi.fn(),
    addComment: vi.fn(),
    resetStorage: vi.fn()
  }
}));

// Mock RichTextEditor
vi.mock('../../components/Posts/RichTextEditor', () => ({
  RichTextEditor: ({ onChange }: { onChange: (value: string) => void }) => (
    <textarea
      data-testid="rich-text-editor"
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write your post content here..."
    />
  )
}));

describe('Posts', () => {
  const mockPosts = [
    {
      id: '1',
      title: 'Post 1',
      content: 'Content 1',
      author: 'Author 1',
      authorId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      likedBy: [],
      image: '',
      tags: [],
      category: 'Internships',
      comments: [],
      status: 'approved'
    },
    {
      id: '2',
      title: 'Post 2',
      content: 'Content 2',
      author: 'Author 2',
      authorId: 'user2',
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      likedBy: [],
      image: '',
      tags: [],
      category: 'Admissions',
      comments: [],
      status: 'approved'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        isAuthenticated: true,
        loading: false,
        currentUser: { studentId: 'test-user-id', name: 'Test User' }
      }
    });
    (PostService.getAllPosts as jest.Mock).mockReturnValue(mockPosts);
  });

  it('renders the page with posts list', () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    expect(screen.getByText('Community Posts')).toBeInTheDocument();
    expect(screen.getByText('Post 1')).toBeInTheDocument();
    expect(screen.getByText('Post 2')).toBeInTheDocument();
  });

  it('displays posts from PostService', () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    expect(PostService.getAllPosts).toHaveBeenCalled();
    expect(screen.getByText('Post 1')).toBeInTheDocument();
    expect(screen.getByText('Post 2')).toBeInTheDocument();
  });

  it('creates a new post when form is submitted', async () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    // Click new post button
    fireEvent.click(screen.getByText('New Post'));

    // Fill in the form
    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByTestId('rich-text-editor');
    const categorySelect = screen.getByLabelText(/category/i);
    
    fireEvent.change(titleInput, {
      target: { value: 'New Post' }
    });
    fireEvent.change(contentInput, {
      target: { value: 'New Content' }
    });
    fireEvent.change(categorySelect, {
      target: { value: 'Internships' }
    });

    // Submit the form
    fireEvent.click(screen.getByText(/submit for approval/i));

    expect(PostService.createPost).toHaveBeenCalled();
  });

  it('likes a post when like button is clicked', () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    // Find and click the like button for Post 1
    const likeButton = screen.getByRole('button', { name: /0/i, description: /Post 1/i });
    fireEvent.click(likeButton);

    expect(PostService.likePost).toHaveBeenCalledWith('1', 'test-user-id');
  });

  it('filters posts by tab category', async () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeInTheDocument();
      expect(screen.getByText('Post 2')).toBeInTheDocument();
    });

    // Click on the Internships tab
    const internshipsTab = screen.getByRole('tab', { name: /internships/i });
    fireEvent.click(internshipsTab);

    // Wait for the filtered posts to be displayed
    await waitFor(() => {
      // Check that Post 1 (Internships category) is visible
      expect(screen.getByText('Post 1')).toBeInTheDocument();
      // Check that Post 2 (Admissions category) is not visible
      expect(screen.queryByText('Post 2')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('filters posts by search query', async () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText('Post 1')).toBeInTheDocument();
      expect(screen.getByText('Post 2')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts/i);
    fireEvent.change(searchInput, { target: { value: 'Post 1' } });

    // Wait for the filtered posts to be displayed
    await waitFor(() => {
      // Check that Post 1 is visible
      expect(screen.getByText('Post 1')).toBeInTheDocument();
      // Check that Post 2 is not visible
      expect(screen.queryByText('Post 2')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('resets posts when reset button is clicked', () => {
    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    const resetButton = screen.getByTitle(/reload posts from json data/i);
    fireEvent.click(resetButton);

    expect(PostService.resetStorage).toHaveBeenCalled();
  });

  it('shows loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      authState: {
        isAuthenticated: false,
        loading: true,
        currentUser: null
      }
    });

    render(
      <BrowserRouter>
        <Posts />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
}); 