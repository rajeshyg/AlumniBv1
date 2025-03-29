import { Post, Comment, PostStatus, ApprovalComment } from '../models/Post';
import { User } from '../models/User';
// import { v4 as uuidv4 } from 'uuid'; - causing errors
import initialPostsJsonData from '../data/posts.json';
import { resolveImagePath } from '../lib/imageUtils';
import { logger } from '../utils/logger';

// Simple UUID generator function as fallback
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const STORAGE_KEY = 'alumni-posts';
const SAMPLE_POSTS: Post[] = [];

export class PostService {
  // Add a reset function to force reload from JSON
  static resetStorage(): void {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    logger.info('Storage reset to empty array');
  }

  private static initializeStorage(): void {
    if (!localStorage.getItem(STORAGE_KEY)) {
      logger.info('Initializing posts in localStorage');
      
      // Transform the complex JSON structure to our Post format
      const formattedPosts = PostService.transformJsonToPosts(initialPostsJsonData);
      logger.debug(`Formatted ${formattedPosts.length} posts for storage`);
      
      // Debug first post comments
      if (formattedPosts.length > 0) {
        logger.debug('First post comments:', formattedPosts[0].comments);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedPosts));
    }
  }

  private static transformJsonToPosts(jsonData: any): Post[] {
    // Check if the data has the new structure with "Posts" array
    if (jsonData.Posts && Array.isArray(jsonData.Posts)) {
      logger.debug(`Processing JSON data with ${jsonData.Posts.length} posts`);
      
      return jsonData.Posts.map((postWrapper: any) => {
        // Each item contains a "Post X" object
        const postKey = Object.keys(postWrapper)[0]; // e.g., "Post 1"
        const postData = postWrapper[postKey];
        
        // Debug logs
        logger.debug(`Processing post: ${postKey}`);
        
        // Extract tags from JSON data - check both capitalized and lowercase keys
        // and ensure it's always an array
        let tags: string[] = [];
        if (Array.isArray(postData.Tags)) {
          tags = [...postData.Tags];
        } else if (Array.isArray(postData.tags)) {
          tags = [...postData.tags];
        } else if (postData.Tags && typeof postData.Tags === 'string') {
          tags = postData.Tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        } else if (postData.tags && typeof postData.tags === 'string') {
          tags = postData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        }
        
        // Transform to our Post structure with camelCase properties
        const transformedPost: Post = {
          id: postData.ID || `post-${Date.now()}`,
          title: postData.Title || '',
          content: postData.Content || '',
          author: postData.Author || '',
          // Handle authorId from either property name
          authorId: postData.authorId || postData.AuthorId || '',
          createdAt: new Date(postData.createdAt || new Date().toISOString()),
          updatedAt: postData.updatedAt ? new Date(postData.updatedAt) : undefined,
          likes: postData.Likes || 0,
          likedBy: [],
          // Resolve image path correctly
          image: resolveImagePath(postData.Image),
          // Handle both category and Category (prefer lowercase)
          category: postData.category || postData.Category || undefined,
          // Use the processed tags array
          tags: tags,
          comments: [],
          // Convert status to lowercase and handle approval details
          status: (postData.status || 'approved').toLowerCase() as PostStatus,
          approvalComments: [],
          approvedBy: undefined,
          approvedById: undefined,
          rejectedBy: undefined,
          rejectedById: undefined,
          lastApprovalDate: undefined,
          expiresAt: undefined
        };
        
        // Handle comments with extra care
        if (Array.isArray(postData.Comments)) {
          const processedComments = postData.Comments.map((comment: any) => {
            return {
              text: comment.Text || '',
              postedBy: comment["Posted by"] || '',
              // Handle postedById from either property name
              postedById: comment.PostedById || comment["PostedById"] || '',
              createdAt: new Date()
            };
          });
          transformedPost.comments = processedComments;
          logger.debug(`Processed ${processedComments.length} comments for ${postKey}`);
        }

        // Handle approval details if present
        if (postData.approvalDetails) {
          const approvalComment: ApprovalComment = {
            text: postData.approvalDetails.comments || '',
            postedBy: postData.approvalDetails.reviewerName || '',
            postedById: postData.approvalDetails.reviewedBy || '',
            createdAt: postData.approvalDetails.reviewedAt ? new Date(postData.approvalDetails.reviewedAt) : new Date(),
            status: transformedPost.status
          };
          transformedPost.approvalComments = [approvalComment];
          
          // Set approval/rejection metadata
          if (transformedPost.status === 'approved') {
            transformedPost.approvedBy = postData.approvalDetails.reviewerName;
            transformedPost.approvedById = postData.approvalDetails.reviewedBy;
            transformedPost.lastApprovalDate = new Date(postData.approvalDetails.reviewedAt);
          } else if (transformedPost.status === 'rejected') {
            transformedPost.rejectedBy = postData.approvalDetails.reviewerName;
            transformedPost.rejectedById = postData.approvalDetails.reviewedBy;
            transformedPost.lastApprovalDate = new Date(postData.approvalDetails.reviewedAt);
          }
        }
        
        return transformedPost;
      });
    }
    
    // If it's the old format or unrecognized, return as is
    logger.info('JSON data format not recognized or empty');
    return Array.isArray(jsonData) ? jsonData : [];
  }

  private static getPostsFromStorage(): any[] {
    PostService.initializeStorage();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static savePostsToStorage(posts: any[]): void {
    logger.debug('Saving posts to localStorage');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  static getAllPosts(): Post[] {
    const posts = PostService.getPostsFromStorage();
    logger.debug(`Retrieved ${posts.length} posts from storage`);
    
    // Convert date strings to Date objects and sort by date (newest first)
    return posts
      .map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt)
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort descending by date
  }

  static getPostById(id: string): Post | undefined {
    const posts = PostService.getPostsFromStorage();
    const post = posts.find(p => p.id === id);
    if (!post) return undefined;
    
    return {
      ...post,
      createdAt: new Date(post.createdAt)
    };
  }

  static createPost(postData: { 
    title: string;
    content: string; 
    author: string;
    authorId: string;
    images?: string[];
    tags?: string[] | string;
    category?: string;
    status: PostStatus;
  }): Post {
    const posts = PostService.getPostsFromStorage();
    
    // Ensure tags is always an array
    let processedTags: string[] = [];
    if (postData.tags) {
      if (Array.isArray(postData.tags)) {
        processedTags = postData.tags;
      } else if (typeof postData.tags === 'string') {
        // Handle case where tags is a comma-separated string
        processedTags = postData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      }
    }

    const newPost = {
      id: generateUUID(),
      title: postData.title,
      content: postData.content,
      author: postData.author,
      authorId: postData.authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      likedBy: [],
      images: postData.images || [],
      tags: processedTags,
      category: postData.category || 'General',
      comments: [],
      status: postData.status,
      approvalComments: []
    };
    
    // Add the new post to the beginning of the array
    const updatedPosts = [newPost, ...posts];
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    logger.debug('Created new post', { id: newPost.id, title: newPost.title, tags: newPost.tags });
    
    // Return with proper Date object
    return {
      ...newPost,
      createdAt: new Date(newPost.createdAt),
      updatedAt: new Date(newPost.updatedAt)
    };
  }

  static updatePost(id: string, postData: any): Post | undefined {
    const posts = this.getPostsFromStorage();
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      logger.info(`Post with ID ${id} not found for update`);
      return undefined;
    }
    
    // Get the existing post
    const existingPost = posts[postIndex];
    logger.debug(`Updating post: ${id}`, existingPost);
    
    // Process tags consistently
    let processedTags: string[] = existingPost.tags || [];
    if (postData.tags !== undefined) {
      if (Array.isArray(postData.tags)) {
        processedTags = postData.tags;
      } else if (typeof postData.tags === 'string') {
        // Handle case where tags is a comma-separated string
        processedTags = postData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      } else {
        // If tags is set to null or another invalid type, use an empty array
        processedTags = [];
      }
    }
    
    // Create the updated post, preserving fields not included in the update
    const updatedPost = {
      ...existingPost,
      title: postData.title,
      content: postData.content,
      category: postData.category || existingPost.category,
      tags: processedTags,
      updatedAt: new Date()
    };
    
    // Update the post in the array
    posts[postIndex] = updatedPost;
    
    // Save back to storage
    this.savePostsToStorage(posts);
    logger.info(`Post ${id} updated successfully`);
    logger.debug('Updated post details', { 
      title: updatedPost.title, 
      tags: updatedPost.tags,
      category: updatedPost.category 
    });
    
    // Return the updated post with proper Date objects
    return {
      ...updatedPost,
      createdAt: new Date(updatedPost.createdAt),
      updatedAt: new Date(updatedPost.updatedAt)
    };
  }

  static approvePost(postId: string, moderator: User, comment: string): Post | undefined {
    const posts = PostService.getPostsFromStorage();
    let updatedPost: Post | undefined;
    
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const approvalComment: ApprovalComment = {
          text: comment,
          postedBy: moderator.name,
          postedById: moderator.studentId,
          createdAt: new Date(),
          status: 'approved'
        };
        
        updatedPost = {
          ...post,
          status: 'approved',
          lastApprovalDate: new Date(),
          approvedBy: moderator.name,
          approvedById: moderator.studentId,
          approvalComments: [...(post.approvalComments || []), approvalComment],
          updatedAt: new Date()
        };
        return updatedPost;
      }
      return post;
    });
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    
    // Return the updated post with proper Date objects
    return updatedPost ? {
      ...updatedPost,
      createdAt: new Date(updatedPost.createdAt),
      updatedAt: updatedPost.updatedAt ? new Date(updatedPost.updatedAt) : undefined,
      lastApprovalDate: updatedPost.lastApprovalDate ? new Date(updatedPost.lastApprovalDate) : undefined
    } : undefined;
  }

  static rejectPost(postId: string, moderator: User, comment: string): Post | undefined {
    const posts = PostService.getPostsFromStorage();
    let updatedPost: Post | undefined;
    
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const approvalComment: ApprovalComment = {
          text: comment,
          postedBy: moderator.name,
          postedById: moderator.studentId,
          createdAt: new Date(),
          status: 'rejected'
        };
        
        updatedPost = {
          ...post,
          status: 'rejected',
          lastApprovalDate: new Date(),
          rejectedBy: moderator.name,
          rejectedById: moderator.studentId,
          approvalComments: [...(post.approvalComments || []), approvalComment],
          updatedAt: new Date()
        };
        return updatedPost;
      }
      return post;
    });
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    
    // Return the updated post with proper Date objects
    return updatedPost ? {
      ...updatedPost,
      createdAt: new Date(updatedPost.createdAt),
      updatedAt: updatedPost.updatedAt ? new Date(updatedPost.updatedAt) : undefined,
      lastApprovalDate: updatedPost.lastApprovalDate ? new Date(updatedPost.lastApprovalDate) : undefined
    } : undefined;
  }

  static getPostsByStatus(status: PostStatus): Post[] {
    const posts = PostService.getPostsFromStorage();
    return posts
      .filter(post => post.status === status)
      .map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: post.updatedAt ? new Date(post.updatedAt) : undefined
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static getPostsByUserAndStatus(userId: string, status?: PostStatus): Post[] {
    const posts = PostService.getPostsFromStorage();
    return posts
      .filter(post => post.authorId === userId && (!status || post.status === status))
      .map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: post.updatedAt ? new Date(post.updatedAt) : undefined
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static likePost(id: string, userId: string): Post | undefined {
    const posts = PostService.getPostsFromStorage();
    let updatedPost: Post | undefined;
    
    const updatedPosts = posts.map(post => {
      if (post.id === id) {
        const alreadyLiked = post.likedBy?.includes(userId);
      
        if (alreadyLiked) {
          post.likedBy = post.likedBy.filter((likedById: string) => likedById !== userId);
          post.likes--;
        } else {
          if (!post.likedBy) post.likedBy = [];
          post.likedBy.push(userId);
          post.likes++;
        }
        updatedPost = { ...post };
        return updatedPost;
      }
      return post;
    });
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    
    // Return the updated post with proper Date object, or undefined if not found
    return updatedPost ? {
      ...updatedPost,
      createdAt: new Date(updatedPost.createdAt)
    } : undefined;
  }

  static addComment(postId: string, text: string, user: User): void {
    const posts = PostService.getPostsFromStorage();
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const comments = post.comments || [];
        const newComment: Comment = {
          text,
          postedBy: user.name, // Use full name directly
          postedById: user.studentId,
          createdAt: new Date()
        };
        return {
          ...post,
          comments: [...comments, newComment]
        };
      }
      return post;
    });
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
  }

  static hasUserLikedPost(id: string, userId: string): boolean {
    const post = PostService.getPostById(id);
    return post?.likedBy.includes(userId) || false;
  }

  static getPostsByUser(userId: string): Post[] {
    logger.debug(`Getting posts for user: ${userId}`);
    const allPosts = this.getAllPosts();
    const userPosts = allPosts.filter(post => post.authorId === userId);
    logger.debug(`Found ${userPosts.length} posts for user ${userId}`);
    return userPosts;
  }

  // Add a utility method to save a backup of the posts
  static downloadPostsBackup(): void {
    try {
      const posts = this.getPostsFromStorage();
      const dataStr = JSON.stringify({ Posts: posts }, null, 2);
      
      // Create a temporary a element to download the file
      const element = document.createElement('a');
      const file = new Blob([dataStr], {type: 'application/json'});
      element.href = URL.createObjectURL(file);
      element.download = `alumni-posts-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      document.body.appendChild(element);
      element.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
      }, 100);
      
      logger.info('Posts backup downloaded successfully');
    } catch (error) {
      logger.error('Failed to download posts backup:', error);
    }
  }
}
