import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostsPage } from './PostsPage';
import { PostService } from '../../services/PostService';

// Mock the PostService
vi.mock('../../services/PostService', () => {
  const mockPosts = [
    {
      id: '1',
      title: 'Test Post 1',
      content: 'Test post 1',
      author: 'Author 1',
      createdAt: new Date('2023-01-15'),
      likes: 5,
      comments: [],
      category: 'Internships',
      tags: ['internship', 'opportunity']
    },
    {
      id: '2',
      title: 'Test Post 2',
      content: 'Test post 2',
      author: 'Author 2',
      createdAt: new Date('2023-02-20'),
      likes: 10,
      comments: [],
      category: 'Scholarships',
      tags: ['scholarship', 'financial-aid']
    }
  ];
  
  return {
    PostService: {
      getAllPosts: vi.fn(() => [...mockPosts]),
      createPost: vi.fn((postData) => {
        const newPost = {
          ...postData,
          id: '3',
          createdAt: new Date(),
          likes: 0,
          comments: []
        };
        mockPosts.push(newPost);
        return newPost;
      }),
      likePost: vi.fn((id) => {
        const post = mockPosts.find(p => p.id === id);
        if (post) {
          post.likes += 1;
          return { ...post };
        }
        return undefined;
      }),
      resetStorage: vi.fn()
    }
  };
});

// Mock the PostForm and PostItem components
vi.mock('./PostForm', () => ({
  PostForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="post-form">
      <button 
        onClick={() => onSubmit({
          title: 'New Post',
          content: 'New content',
          author: 'New Author'
        })}
      >
        Submit Form
      </button>
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </div>
  )
}));

vi.mock('./PostItem', () => ({
  PostItem: ({ post, onLike, onComment }: any) => (
    <div data-testid={`post-item-${post.id}`}>
      <div>{post.title || 'Untitled'}</div>
      <div>{post.content}</div>
      <div>By {post.author}</div>
      <button onClick={() => onLike(post.id)}>
        Like ({post.likes})
      </button>
      {onComment && (
        <button onClick={() => onComment(post.id, 'Comment text', 'Comment author')}>
          Comment
        </button>
      )}
    </div>
  )
}));

// Export the test suite
export default describe('PostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the page with posts list', () => {
    render(<PostsPage />);
    
    expect(screen.getByText('Community Posts')).toBeInTheDocument();
    expect(screen.getByText('Recent Posts')).toBeInTheDocument();
    expect(PostService.getAllPosts).toHaveBeenCalledTimes(1);
  });
  
  it('displays posts from PostService', () => {
    render(<PostsPage />);
    
    // Check if posts are displayed
    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    expect(screen.getByText('By Author 1')).toBeInTheDocument();
    expect(screen.getByText('By Author 2')).toBeInTheDocument();
  });
  
  it('creates a new post when form is submitted', () => {
    render(<PostsPage />);
    
    // First click the New Post button to show the form
    fireEvent.click(screen.getByText('New Post'));
    
    // Now the form should be visible and we can find the submit button
    fireEvent.click(screen.getByText('Submit Form'));
    
    expect(PostService.createPost).toHaveBeenCalledTimes(1);
    expect(PostService.createPost).toHaveBeenCalledWith({
      title: 'New Post',
      content: 'New content',
      author: 'New Author'
    });
    expect(PostService.getAllPosts).toHaveBeenCalledTimes(2); // Initial + after creation
  });
  
  it('likes a post when like button is clicked', () => {
    render(<PostsPage />);
    
    // Find like buttons in our mocked PostItems
    const likeButtons = screen.getAllByText(/Like \(\d+\)/i);
    fireEvent.click(likeButtons[0]); // Like the first post
    
    expect(PostService.likePost).toHaveBeenCalledTimes(1);
    expect(PostService.likePost).toHaveBeenCalledWith('1');
    expect(PostService.getAllPosts).toHaveBeenCalledTimes(2); // Initial + after liking
  });

  it('filters posts by category', () => {
    render(<PostsPage />);
    
    // Initially both posts should be displayed
    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    
    // Find category selector by test ID instead of label
    const categorySelector = screen.getByTestId('category-select');
    fireEvent.change(categorySelector, { target: { value: 'Internships' } });
    
    // Now only the first post should be visible
    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Post 2')).not.toBeInTheDocument();
  });
});
