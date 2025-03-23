import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Post } from '../models/Post';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { useAuth } from '../context/AuthContext';

// Mock the PostService module completely
vi.mock('../services/PostService', () => ({
  PostService: {
    getAllPosts: vi.fn(),
    getPostById: vi.fn(),
    createPost: vi.fn(),
    likePost: vi.fn(),
    addComment: vi.fn(),
    resetStorage: vi.fn(),
    hasUserLikedPost: vi.fn(),
    getPostsByUser: vi.fn()
  }
}));

// Import after mocking
import { PostService } from '../services/PostService';

// Mock the components that use rich text editor
vi.mock('../components/Posts/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder, id }) => (
    <textarea 
      data-testid="rich-text-editor"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));

vi.mock('../components/Posts/ImageUploader', () => ({
  ImageUploader: ({ images, onChange }) => (
    <div data-testid="image-uploader">
      <button type="button">Add Image</button>
    </div>
  )
}));

// Mock auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('Tags Integration', () => {
  const mockUser = {
    studentId: "test-user-id",
    name: "Test User",
    email: "test@example.com"
  };

  // Sample post data
  const mockPostsData = [
    {
      id: '1',
      title: 'Test Post with Tags',
      content: 'This is a test post with tags',
      author: 'Test Author',
      authorId: 'author-1',
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      category: 'Internships',
      tags: ['internship', 'career', 'opportunity']
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock the auth context
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: mockUser,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    });
    
    // Set up PostService mocks
    vi.mocked(PostService.getAllPosts).mockReturnValue(mockPostsData);
    vi.mocked(PostService.resetStorage).mockImplementation(() => {
      console.log('Mock resetStorage called');
    });
  });

  it('should allow adding tags in PostForm and display them in PostItem', () => {
    const mockSubmit = vi.fn();
    const mockLike = vi.fn();
    
    // Step 1: Render PostForm and add tags
    const { rerender } = render(<PostForm onSubmit={mockSubmit} />);
    
    // Fill in the form title and content
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Post with Tags' } });
    fireEvent.change(screen.getByTestId('rich-text-editor'), { target: { value: 'This is a test post content.' } });
    
    // Add tags by typing and pressing Enter
    const tagInput = screen.getByPlaceholderText(/add tags/i);
    
    // Add first tag
    fireEvent.change(tagInput, { target: { value: 'react' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Add second tag
    fireEvent.change(tagInput, { target: { value: 'testing' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Submit the form
    fireEvent.submit(screen.getByText(/create post/i));
    
    // Expect submit to be called with the right data
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Post with Tags',
      content: 'This is a test post content.',
      tags: ['react', 'testing']
    }));
    
    // Step 2: Verify tags display in PostItem
    const mockPost = {
      id: 'test-post-id',
      title: 'Test Post with Tags',
      content: 'This is a test post content.',
      author: mockUser.name,
      authorId: mockUser.studentId,
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      tags: ['react', 'testing']
    };
    
    rerender(<PostItem post={mockPost} onLike={mockLike} />);
    
    // Check if both tags are displayed
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });

  it('should display tags from JSON in PostItem', () => {
    // Render post item with our mocked data
    render(<PostItem post={mockPostsData[0]} onLike={() => {}} />);
    
    // Verify tags are displayed
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('career')).toBeInTheDocument();
    expect(screen.getByText('opportunity')).toBeInTheDocument();
  });

  it('should display lowercase tags in PostItem', () => {
    // Mock a post with lowercase tags
    const postWithLowercaseTags: Post = {
      id: '2',
      title: 'Post with Lowercase Tags',
      content: 'Content with lowercase tags',
      author: 'Test Author',
      authorId: 'author-2',
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      category: 'Internships',
      tags: ['yale', 'summer', 'internship', 'usa']
    };
    
    // Render the post item
    render(<PostItem post={postWithLowercaseTags} onLike={() => {}} />);
    
    // Verify lowercase tags are displayed
    expect(screen.getByText('yale')).toBeInTheDocument();
    expect(screen.getByText('summer')).toBeInTheDocument();
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('usa')).toBeInTheDocument();
  });
});
