import { Post, Comment, PostStatus, ApprovalComment } from '../models/Post';
import { User } from '../models/User';
// import { v4 as uuidv4 } from 'uuid'; - causing errors
import initialPostsJsonData from '../data/posts.json';
import { resolveImagePath } from '../lib/imageUtils';

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
    console.log('Storage reset to empty array');
  }

  private static initializeStorage(): void {
    if (!localStorage.getItem(STORAGE_KEY)) {
      console.log('Initializing posts in localStorage');
      
      // Transform the complex JSON structure to our Post format
      const formattedPosts = PostService.transformJsonToPosts(initialPostsJsonData);
      console.log(`Formatted ${formattedPosts.length} posts for storage`);
      
      // Debug first post comments
      if (formattedPosts.length > 0) {
        console.log('First post comments:', formattedPosts[0].comments);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedPosts));
    }
  }

  private static transformJsonToPosts(jsonData: any): Post[] {
    // Check if the data has the new structure with "Posts" array
    if (jsonData.Posts && Array.isArray(jsonData.Posts)) {
      console.log(`Processing JSON data with ${jsonData.Posts.length} posts`);
      
      return jsonData.Posts.map((postWrapper: any) => {
        // Each item contains a "Post X" object
        const postKey = Object.keys(postWrapper)[0]; // e.g., "Post 1"
        const postData = postWrapper[postKey];
        
        // Debug logs
        console.log(`${postKey} comments:`, postData.Comments);
        console.log(`${postKey} image:`, postData.Image);
        console.log(`${postKey} tags:`, postData.Tags || postData.tags);
        
        // Transform to our Post structure with camelCase properties
        const transformedPost: Post = {
          id: postData.ID || `post-${Date.now()}`,
          title: postData.Title || '',
          content: postData.Content || '',
          author: postData.Author || '',
          authorId: postData.AuthorId || '',
          createdAt: new Date(postData.createdAt || new Date().toISOString()),
          updatedAt: postData.updatedAt ? new Date(postData.updatedAt) : undefined,
          likes: postData.Likes || 0,
          likedBy: [],
          // Resolve image path correctly
          image: resolveImagePath(postData.Image),
          // Handle both category and Category (prefer lowercase)
          category: postData.category || postData.Category || undefined,
          // Extract tags from JSON data - check both capitalized and lowercase keys
          tags: Array.isArray(postData.Tags) ? [...postData.Tags] : 
               (Array.isArray(postData.tags) ? [...postData.tags] : undefined),
          comments: [],
          // Convert status to lowercase and handle approval details
          status: (postData.status || 'pending').toLowerCase() as PostStatus,
          approvalComments: [],
          approvedBy: undefined,
          approvedById: undefined,
          rejectedBy: undefined,
          rejectedById: undefined,
          lastApprovalDate: undefined,
          expiresAt: undefined
        };
        
        // Handle comments with extra care and debugging
        if (Array.isArray(postData.Comments)) {
          const processedComments = postData.Comments.map((comment: any) => {
            console.log('Processing comment:', comment);
            return {
              text: comment.Text || '',
              postedBy: comment["Posted by"] || '',
              postedById: comment.PostedById || '',
              createdAt: new Date()
            };
          });
          transformedPost.comments = processedComments;
          console.log(`Processed ${processedComments.length} comments for ${postKey}`);
        } else {
          console.log(`No comments array found for ${postKey}`);
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
    console.log('JSON data format not recognized or empty');
    return Array.isArray(jsonData) ? jsonData : [];
  }

  private static getPostsFromStorage(): any[] {
    PostService.initializeStorage();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static savePostsToStorage(posts: any[]): void {
    console.log('Saving posts to localStorage:', posts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  static getAllPosts(): Post[] {
    const posts = PostService.getPostsFromStorage();
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
    tags?: string[];
    category?: string;
    status: PostStatus;
  }): Post {
    const posts = PostService.getPostsFromStorage();
    
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
      tags: postData.tags || [],
      category: postData.category || 'General',
      comments: [],
      status: postData.status,
      approvalComments: []
    };
    
    // Add the new post to the beginning of the array
    const updatedPosts = [newPost, ...posts];
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    
    // Return with proper Date object
    return {
      ...newPost,
      createdAt: new Date(newPost.createdAt),
      updatedAt: new Date(newPost.updatedAt)
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
    const allPosts = this.getAllPosts();
    return allPosts.filter(post => post.authorId === userId);
  }
}
