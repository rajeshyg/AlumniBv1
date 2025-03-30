import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { PostItem } from '../../components/Posts/PostItem';
import { Post, PostStatus } from '../../models/Post';
import { User } from '../../models/User';
import { vi } from 'vitest';
import { PostForm } from '../../components/Posts/PostForm';
import { useAuth } from '../../context/AuthContext';
import { PostService } from '../../services/PostService';

// Mock useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authState: { isAuthenticated: true, currentUser: { studentId: 'user123' } }
  })
}));

// Mock PostService
vi.mock('../../services/PostService', () => ({
  PostService: {
    createPost: vi.fn(),
    getAllPosts: vi.fn(() => []), // Return empty array initially
    likePost: vi.fn(),
    addComment: vi.fn(),
  }
}));

// Mock PostForm - we don't need its implementation for this integration test
vi.mock('../../components/Posts/PostForm', () => ({
  PostForm: () => <div data-testid="mock-post-form">Mock Post Form</div>,
}));

const mockUser: User = {
  studentId: 'user123',
  name: 'Test User',
  email: 'test@example.com',
};

const mockPost: Post = {
  id: 'post1',
      title: 'Test Post with Tags',
  content: 'This post has several tags.',
  author: 'Author Name',
  authorId: 'author1',
      createdAt: new Date(),
  likes: 5,
      likedBy: [],
  comments: [],
  tags: ['react', 'typescript', 'testing', 'vitest'],
  status: 'approved' as PostStatus,
};

describe('Tags Integration Test', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Provide a default mock implementation for getAllPosts if needed
    vi.mocked(PostService.getAllPosts).mockReturnValue([mockPost]);
  });

  it('should display tags correctly in PostItem', () => {
    render(
      <Router>
        <PostItem post={mockPost} onLike={() => {}} onComment={() => {}} />
      </Router>
    );

    // Find the tags section within the post item
    const tagsContainer = screen.getByTestId('post-tags');
    expect(tagsContainer).toBeInTheDocument();

    // Check if each tag is rendered
    mockPost.tags?.forEach(tag => {
      // Use within to scope the search to the tags container
      const tagElement = within(tagsContainer).getByText(tag);
      expect(tagElement).toBeInTheDocument();
      // Check for specific styling or element type if needed
      expect(tagElement).toHaveClass('bg-primary/10'); // Updated class
    });
  });

  it('should handle posts with no tags gracefully', () => {
    const postWithoutTags: Post = {
      ...mockPost,
      tags: undefined, // No tags
    };

    render(
      <Router>
        <PostItem post={postWithoutTags} onLike={() => {}} onComment={() => {}} />
      </Router>
    );

    // The container should exist but not contain any tag elements
    const tagsContainer = screen.getByTestId('post-tags');
    expect(tagsContainer).toBeInTheDocument();
    
    // Verify it only contains the category (if any)
    if (postWithoutTags.category) {
      expect(within(tagsContainer).getByText(postWithoutTags.category)).toBeInTheDocument();
    }
    
    // Verify no other tag elements exist
    expect(within(tagsContainer).queryAllByRole('generic')).toHaveLength(postWithoutTags.category ? 1 : 0);
  });

  it('should handle posts with an empty tags array', () => {
    const postWithEmptyTags: Post = {
      ...mockPost,
      tags: [], // Empty array
    };

    render(
      <Router>
        <PostItem post={postWithEmptyTags} onLike={() => {}} onComment={() => {}} />
      </Router>
    );

    // The container should exist but not contain any tag elements
    const tagsContainer = screen.getByTestId('post-tags');
    expect(tagsContainer).toBeInTheDocument();
    
    // Verify it only contains the category (if any)
    if (postWithEmptyTags.category) {
      expect(within(tagsContainer).getByText(postWithEmptyTags.category)).toBeInTheDocument();
    }
    
    // Verify no other tag elements exist beyond the category
    expect(within(tagsContainer).queryAllByRole('generic')).toHaveLength(postWithEmptyTags.category ? 1 : 0);
  });
});
