import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Posts from './Posts';
import { PostService } from '../services/PostService';
import { useAuth } from '../context/AuthContext';

// Mock the dependencies
vi.mock('../services/PostService', () => ({
  PostService: {
    getAllPosts: vi.fn(),
    createPost: vi.fn(),
    likePost: vi.fn(),
    addComment: vi.fn(),
    resetStorage: vi.fn(),
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock components used in Posts
vi.mock('../components/Posts/PostItem', () => ({
  PostItem: ({ post, onLike, onComment }) => (
    <div data-testid={`post-${post.id}`}>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <button onClick={() => onLike(post.id, 'test-user-id')}>Like</button>
      {onComment && <button onClick={() => onComment(post.id, 'Test comment', {})}>Comment</button>}
    </div>
  )
}));

vi.mock('../components/Posts/PostForm', () => ({
  PostForm: ({ onSubmit, onCancel }) => (
    <form data-testid="post-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        title: 'New Post',
        content: 'New Content',
        author: 'Test User',
        authorId: 'test-user-id'
      });
    }}>
      <button type="submit">Submit</button>
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </form>
  )
}));

vi.mock('../components/shared/TabNavigation', () => ({
  TabNavigation: ({ tabs, activeTab, onTabChange }) => (
    <div data-testid="tab-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          data-active={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}));

describe('Posts', () => {
  const mockPosts = [
    { id: '1', title: 'Post 1', content: 'Content 1', author: 'Author 1', authorId: 'user1', createdAt: new Date(), likes: 5, category: 'Internships', likedBy: [] },
    { id: '2', title: 'Post 2', content: 'Content 2', author: 'Author 2', authorId: 'user2', createdAt: new Date(), likes: 3, category: 'Admissions', likedBy: [] }
  ];

  const mockUser = {
    studentId: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (PostService.getAllPosts as any).mockReturnValue(mockPosts);
    (useAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        currentUser: mockUser,
        loading: false,
        error: null
      },
      logout: vi.fn()
    });
  });

  const renderWithRouter = (ui: React.ReactNode) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders the page with posts list', () => {
    renderWithRouter(<Posts />);
    
    expect(screen.getByText('Community Posts')).toBeInTheDocument();
    expect(PostService.getAllPosts).toHaveBeenCalled();
  });

  it('displays posts from PostService', () => {
    renderWithRouter(<Posts />);
    
    expect(screen.getByTestId('post-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-2')).toBeInTheDocument();
  });

  it('creates a new post when form is submitted', () => {
    renderWithRouter(<Posts />);
    
    // Click new post button to show form
    fireEvent.click(screen.getByText('New Post'));
    
    // Form should be visible
    const form = screen.getByTestId('post-form');
    expect(form).toBeInTheDocument();
    
    // Submit the form
    fireEvent.submit(form);
    
    // Check if createPost was called
    expect(PostService.createPost).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Post',
      content: 'New Content'
    }));
  });

  it('likes a post when like button is clicked', () => {
    renderWithRouter(<Posts />);
    
    // Find and click the like button on the first post
    const likeButton = screen.getByTestId('post-1').querySelector('button');
    fireEvent.click(likeButton!);
    
    // Check if likePost was called with the right arguments
    expect(PostService.likePost).toHaveBeenCalledWith('1', 'test-user-id');
  });

  it('filters posts by tab category', () => {
    renderWithRouter(<Posts />);
    
    // Click on a specific category tab
    fireEvent.click(screen.getByTestId('tab-Internships'));
    
    // Should filter the posts
    expect(screen.queryByTestId('post-1')).toBeInTheDocument();
    expect(screen.queryByTestId('post-2')).not.toBeInTheDocument();
  });

  it('filters posts by search query', () => {
    renderWithRouter(<Posts />);
    
    // Type in search box
    fireEvent.change(screen.getByPlaceholderText('Search posts...'), {
      target: { value: 'Post 1' }
    });
    
    // Should filter the posts
    expect(screen.queryByTestId('post-1')).toBeInTheDocument();
    expect(screen.queryByTestId('post-2')).not.toBeInTheDocument();
  });
});
