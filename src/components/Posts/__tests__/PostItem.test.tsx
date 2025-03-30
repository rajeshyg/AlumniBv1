import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostItem } from '../PostItem';
import { Post } from '../../../models/Post';
import { useAuth } from '../../../context/AuthContext';

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    authState: {
      currentUser: { 
        studentId: 'test-user-id',
        name: 'Test User'
      },
      isAuthenticated: true,
      loading: false
    }
  })
}));

describe('PostItem', () => {
  const mockPost: Post = {
    id: '1',
    title: 'Test Post Title',
    content: 'Test post content',
    author: 'Test Author',
    authorId: 'author-123',
    createdAt: new Date('2023-05-15'),
    likes: 5,
    likedBy: [],
    category: 'Internships',
    tags: ['internship', 'opportunity'],
    status: 'approved' as const
  };
  
  const mockOnLike = vi.fn();
  const mockOnComment = vi.fn();
  
  // Mock user for auth context
  const mockUser = {
    studentId: "test-user-id",
    name: "Test User",
    email: "test@example.com"
  };
  
  beforeEach(() => {
    vi.resetAllMocks();
    // Setup mock auth context
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: mockUser,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    });
  });
  
  it('renders post content correctly', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Check for title
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    
    // Check for content
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    
    // Check for author - now prefixed with "By"
    expect(screen.getByText(/By Test Author/)).toBeInTheDocument();
    
    // Check for likes count
    expect(screen.getByText('5')).toBeInTheDocument();
    
    // Verify date formatting - assuming local date format
    const formattedDate = new Date('2023-05-15').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });
  
  it('displays category and tags correctly', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Check for category
    expect(screen.getByText('Internships')).toBeInTheDocument();
    
    // Check for tags
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('opportunity')).toBeInTheDocument();
  });
  
  it('calls onLike when the like button is clicked', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Find like button and click it
    const likeButton = screen.getByText('5').closest('button');
    expect(likeButton).toBeInTheDocument();
    
    fireEvent.click(likeButton!);
    
    expect(mockOnLike).toHaveBeenCalledTimes(1);
    expect(mockOnLike).toHaveBeenCalledWith('1', mockUser.studentId);
  });

  it('displays multiple tags correctly', () => {
    const postWithMultipleTags = {
      ...mockPost,
      tags: ['javascript', 'react', 'testing']
    };
    
    render(<PostItem post={postWithMultipleTags} onLike={mockOnLike} />);
    
    // Check for all tags
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });
  
  it('handles missing tags gracefully', () => {
    const postWithoutTags = {
      ...mockPost,
      tags: undefined
    };
    
    // This should render without errors
    render(<PostItem post={postWithoutTags} onLike={mockOnLike} />);
    
    // Should still render the post content
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });
});

describe('PostItem Comments Preview', () => {
  const mockPost = {
    id: '1',
    title: 'Test Post',
    content: 'Test content',
    author: 'Test Author',
    authorId: '123',
    createdAt: new Date(),
    likes: 0,
    likedBy: [],
    status: 'approved' as const,
    comments: [
      { text: 'Comment 1', postedBy: 'User 1', postedById: '1', createdAt: new Date() },
      { text: 'Comment 2', postedBy: 'User 2', postedById: '2', createdAt: new Date() },
      { text: 'Comment 3', postedBy: 'User 3', postedById: '3', createdAt: new Date() },
      { text: 'Comment 4', postedBy: 'User 4', postedById: '4', createdAt: new Date() }
    ]
  };

  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: { 
          studentId: 'test-user-id',
          name: 'Test User'
        },
        isAuthenticated: true,
        loading: false
      }
    });
  });

  it('should show preview of comments initially', () => {
    render(
      <PostItem 
        post={mockPost}
        onLike={() => {}}
        onComment={() => {}}
      />
    );

    // Click to show comments
    const commentButton = screen.getByRole('button', { 
      name: /comments/i 
    });
    fireEvent.click(commentButton);

    // Should show only first 2 comments
    expect(screen.getByText('Comment 1')).toBeInTheDocument();
    expect(screen.getByText('Comment 2')).toBeInTheDocument();
    expect(screen.queryByText('Comment 3')).not.toBeInTheDocument();

    // Should show "View all comments" button
    expect(screen.getByText(/View all 4 comments/i)).toBeInTheDocument();
  });

  it('should show all comments when "View all" is clicked', () => {
    render(
      <PostItem 
        post={mockPost}
        onLike={() => {}}
        onComment={() => {}}
      />
    );

    // Click to show comments
    const commentButton = screen.getByRole('button', { 
      name: /comments/i 
    });
    fireEvent.click(commentButton);

    // Click to show all comments
    fireEvent.click(screen.getByText(/View all 4 comments/i));

    // Should show all comments
    expect(screen.getByText('Comment 1')).toBeInTheDocument();
    expect(screen.getByText('Comment 2')).toBeInTheDocument();
    expect(screen.getByText('Comment 3')).toBeInTheDocument();
    expect(screen.getByText('Comment 4')).toBeInTheDocument();

    // Should show "Show less" button
    expect(screen.getByText(/Show less/i)).toBeInTheDocument();
  });
});
