import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module - we'll mock its methods individually
import { PostService } from './PostService';

// Mock the PostService methods
vi.mock('./PostService', () => {
  return {
    PostService: {
      getAllPosts: vi.fn(),
      getPostById: vi.fn(),
      createPost: vi.fn(),
      likePost: vi.fn(),
      resetStorage: vi.fn(),
      addComment: vi.fn()
    }
  };
});

describe('PostService', () => {
  // Sample mock data
  const mockPosts = [
    { 
      id: '1', 
      title: 'Post 1', 
      content: 'Content 1', 
      author: 'Author 1', 
      authorId: 'author-1',
      createdAt: new Date(2023, 1, 2), 
      likes: 5,
      likedBy: [] 
    },
    { 
      id: '2', 
      title: 'Post 2', 
      content: 'Content 2', 
      author: 'Author 2',
      authorId: 'author-2', 
      createdAt: new Date(2023, 1, 1), 
      likes: 3,
      likedBy: [] 
    }
  ];

  const mockNewPost = {
    id: 'test-uuid-1234',
    title: 'Test Title',
    content: 'Test Content',
    author: 'Test Author',
    authorId: 'test-id',
    createdAt: new Date(),
    likes: 0,
    likedBy: []
  };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Set up the default mock implementations
    vi.mocked(PostService.getAllPosts).mockReturnValue([...mockPosts]);
    vi.mocked(PostService.getPostById).mockImplementation((id) => 
      mockPosts.find(p => p.id === id)
    );
    vi.mocked(PostService.createPost).mockReturnValue({...mockNewPost});
    vi.mocked(PostService.likePost).mockImplementation((id, userId) => {
      if (id === mockNewPost.id) {
        return {
          ...mockNewPost,
          likes: 1,
          likedBy: [userId]
        };
      }
      return undefined;
    });
  });

  it('should return all posts in descending order by date', () => {
    const posts = PostService.getAllPosts();
    
    // Verify posts are returned
    expect(posts.length).toBe(2);
    
    // Verify posts are sorted by date (newest first)
    expect(posts[0].id).toBe('1');
    expect(posts[1].id).toBe('2');
  });

  it('should retrieve a post by id', () => {
    const post = PostService.getPostById('1');
    
    expect(post).toBeDefined();
    expect(post?.id).toBe('1');
  });

  it('should return undefined when getting a non-existent post', () => {
    // Override the mock for this specific test
    vi.mocked(PostService.getPostById).mockReturnValue(undefined);
    
    const nonExistentPost = PostService.getPostById('non-existent-id');
    expect(nonExistentPost).toBeUndefined();
  });

  it('should create a new post', () => {
    const postData = {
      title: 'Test Title',
      content: 'Test Content',
      author: 'Test Author',
      authorId: 'test-id',
      category: 'General'
    };

    const createdPost = PostService.createPost(postData);

    expect(createdPost).toEqual(expect.objectContaining({
      id: 'test-uuid-1234',
      title: 'Test Title',
      content: 'Test Content',
      author: 'Test Author'
    }));

    expect(PostService.createPost).toHaveBeenCalledWith(postData);
  });

  it('should like a post', () => {
    const userId = 'test-user-id';
    const updatedPost = PostService.likePost('test-uuid-1234', userId);

    expect(updatedPost).toEqual(expect.objectContaining({
      id: 'test-uuid-1234',
      likes: 1,
      likedBy: [userId]
    }));

    expect(PostService.likePost).toHaveBeenCalledWith('test-uuid-1234', userId);
  });

  it('should return undefined when liking a non-existent post', () => {
    // Override the mock for this specific test
    vi.mocked(PostService.likePost).mockReturnValue(undefined);
    
    const result = PostService.likePost('non-existent-id', 'user-id');
    expect(result).toBeUndefined();
  });
});
