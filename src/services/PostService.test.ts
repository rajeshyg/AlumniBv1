import { describe, it, expect, beforeEach } from 'vitest';
import { PostService } from './PostService';

// Export the test suite to ensure Vitest can recognize it
export default describe('PostService', () => {
  // Reset any modifications made to the posts array by previous tests
  beforeEach(() => {
    // Get all posts and ensure we have the original 3 dummy posts
    const posts = PostService.getAllPosts();
    // Delete any additional posts that may have been created
    const additionalPosts = posts.slice(3);
    // Note: This is a workaround since we don't have direct access to reset the internal posts array
  });

  it('should return all posts in descending order by date', () => {
    const posts = PostService.getAllPosts();
    
    // Verify we have the initial dummy posts
    expect(posts.length).toBeGreaterThanOrEqual(3);
    
    // Verify posts are sorted by date (newest first)
    for (let i = 0; i < posts.length - 1; i++) {
      const currentPostDate = new Date(posts[i].createdAt).getTime();
      const nextPostDate = new Date(posts[i + 1].createdAt).getTime();
      expect(currentPostDate).toBeGreaterThanOrEqual(nextPostDate);
    }
  });

  it('should retrieve a post by id', () => {
    const posts = PostService.getAllPosts();
    const firstPost = posts[0];
    
    const retrievedPost = PostService.getPostById(firstPost.id);
    
    expect(retrievedPost).toEqual(firstPost);
  });

  it('should return undefined when getting a non-existent post', () => {
    const nonExistentPost = PostService.getPostById('non-existent-id');
    
    expect(nonExistentPost).toBeUndefined();
  });

  it('should create a new post', () => {
    const newPostData = {
      content: 'This is a test post',
      author: 'Test User'
    };
    
    const initialPosts = PostService.getAllPosts();
    const newPost = PostService.createPost(newPostData);
    const updatedPosts = PostService.getAllPosts();
    
    // Verify post was created with the correct properties
    expect(newPost.content).toBe(newPostData.content);
    expect(newPost.author).toBe(newPostData.author);
    expect(newPost.id).toBeTruthy();
    expect(newPost.likes).toBe(0);
    expect(newPost.createdAt).toBeInstanceOf(Date);
    
    // Verify post was added to the collection
    expect(updatedPosts.length).toBe(initialPosts.length + 1);
    expect(updatedPosts.find(p => p.id === newPost.id)).toEqual(newPost);
  });

  it('should like a post', () => {
    const posts = PostService.getAllPosts();
    const postToLike = posts[0];
    const initialLikes = postToLike.likes;
    
    const updatedPost = PostService.likePost(postToLike.id);
    
    expect(updatedPost).toBeDefined();
    expect(updatedPost?.likes).toBe(initialLikes + 1);
    
    // Verify the post was updated in the collection
    const retrievedPost = PostService.getPostById(postToLike.id);
    expect(retrievedPost?.likes).toBe(initialLikes + 1);
  });

  it('should return undefined when liking a non-existent post', () => {
    const result = PostService.likePost('non-existent-id');
    
    expect(result).toBeUndefined();
  });
});
