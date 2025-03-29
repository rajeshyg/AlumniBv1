import { PostService } from '../PostService';
import { Post, PostStatus } from '../../models/Post';
import { User } from '../../models/User';

describe('PostService', () => {
  const mockUser: User = {
    studentId: '123',
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockPost: Post = {
    id: '1',
    title: 'Test Post',
    content: 'Test Content',
    author: 'Test Author',
    authorId: '123',
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    likedBy: [],
    image: '',
    tags: [],
    category: 'General',
    comments: [],
    status: 'pending',
    approvalComments: []
  };

  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
    PostService.resetStorage();
  });

  describe('getPostsByStatus', () => {
    it('should return posts with the specified status', async () => {
      // Clear any existing posts
      localStorage.clear();
      
      // Create a post with pending status
      const testPrefix = `test_${Date.now()}_`;
      const pendingPost = PostService.createPost({
        title: `${testPrefix}Pending Post`,
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'pending'
      });

      // Create a post with approved status
      const approvedPost = PostService.createPost({
        title: `${testPrefix}Approved Post`,
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'approved'
      });

      const pendingPosts = PostService.getPostsByStatus('pending');
      const testPendingPosts = pendingPosts.filter(p => p.title.startsWith(testPrefix));
      expect(testPendingPosts).toHaveLength(1);
      expect(testPendingPosts[0].id).toBe(pendingPost.id);
      expect(testPendingPosts[0].status).toBe('pending');
    });
  });

  describe('approvePost', () => {
    it('should update post status to approved and add approval comment', async () => {
      const post = PostService.createPost({
        title: 'Test Post',
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'pending'
      });

      const comment = 'This post looks good!';
      const updatedPost = PostService.approvePost(post.id, mockUser, comment);

      expect(updatedPost).toBeDefined();
      expect(updatedPost?.status).toBe('approved');
      expect(updatedPost?.approvalComments?.length).toBe(1);
      expect(updatedPost?.approvalComments?.[0].text).toBe(comment);
      expect(updatedPost?.approvalComments?.[0].postedBy).toBe(mockUser.name);
      expect(updatedPost?.approvedBy).toBe(mockUser.name);
      expect(updatedPost?.approvedById).toBe(mockUser.studentId);
    });

    it('should return undefined if post not found', async () => {
      const updatedPost = PostService.approvePost('non-existent-id', mockUser, 'comment');
      expect(updatedPost).toBeUndefined();
    });
  });

  describe('rejectPost', () => {
    it('should update post status to rejected and add rejection comment', async () => {
      const post = PostService.createPost({
        title: 'Test Post',
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'pending'
      });

      const comment = 'This post needs revision';
      const updatedPost = PostService.rejectPost(post.id, mockUser, comment);

      expect(updatedPost).toBeDefined();
      expect(updatedPost?.status).toBe('rejected');
      expect(updatedPost?.approvalComments?.length).toBe(1);
      expect(updatedPost?.approvalComments?.[0].text).toBe(comment);
      expect(updatedPost?.approvalComments?.[0].postedBy).toBe(mockUser.name);
      expect(updatedPost?.rejectedBy).toBe(mockUser.name);
      expect(updatedPost?.rejectedById).toBe(mockUser.studentId);
    });

    it('should return undefined if post not found', async () => {
      const updatedPost = PostService.rejectPost('non-existent-id', mockUser, 'comment');
      expect(updatedPost).toBeUndefined();
    });
  });

  describe('getPostsByUserAndStatus', () => {
    it('should return posts by user with optional status filter', async () => {
      // Create posts for the same user with different statuses
      PostService.createPost({
        title: 'Pending Post',
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'pending'
      });

      PostService.createPost({
        title: 'Approved Post',
        content: 'Content',
        author: 'Author',
        authorId: '123',
        status: 'approved'
      });

      // Create a post for a different user
      PostService.createPost({
        title: 'Other User Post',
        content: 'Content',
        author: 'Other Author',
        authorId: '456',
        status: 'pending'
      });

      const userPosts = PostService.getPostsByUserAndStatus('123');
      expect(userPosts).toHaveLength(2);

      const userPendingPosts = PostService.getPostsByUserAndStatus('123', 'pending');
      expect(userPendingPosts).toHaveLength(1);
      expect(userPendingPosts[0].status).toBe('pending');
    });
  });
}); 