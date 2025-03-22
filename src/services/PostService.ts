import { Post, Comment } from '../models/Post';
import initialPostsJsonData from '../data/posts.json';
import { resolveImagePath } from '../lib/imageUtils';

const STORAGE_KEY = 'alumni-posts';

export class PostService {
  // Add a reset function to force reload from JSON
  static resetStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Storage reset, reloading from JSON file');
    // Force initialization
    this.initializeStorage();
    console.log('Storage initialized with JSON data');
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

  private static transformJsonToPosts(jsonData: any): any[] {
    // Check if the data has the new structure with "Posts" array
    if (jsonData.Posts && Array.isArray(jsonData.Posts)) {
      console.log(`Processing JSON data with ${jsonData.Posts.length} posts`);
      
      return jsonData.Posts.map((postWrapper: any) => {
        // Each item contains a "Post X" object
        const postKey = Object.keys(postWrapper)[0]; // e.g., "Post 1"
        const postData = postWrapper[postKey];
        
        // Debug comments specifically
        console.log(`${postKey} comments:`, postData.Comments);
        console.log(`${postKey} image:`, postData.Image);
        
        // Transform to our Post structure with camelCase properties
        const transformedPost = {
          id: postData.ID || `post-${Date.now()}`,
          title: postData.Title || '',
          content: postData.Content || '',
          author: postData.Author || '',
          createdAt: postData.createdAt || new Date().toISOString(),
          likes: postData.Likes || 0,
          // Resolve image path correctly
          image: resolveImagePath(postData.Image),
          category: postData.Category || undefined,
          comments: []
        };
        
        // Handle comments with extra care and debugging
        if (Array.isArray(postData.Comments)) {
          transformedPost.comments = postData.Comments.map((comment: any) => {
            console.log('Processing comment:', comment);
            return {
              text: comment.Text || '',
              postedBy: comment["Posted by"] || ''
            };
          });
          console.log(`Processed ${transformedPost.comments.length} comments for ${postKey}`);
        } else {
          console.log(`No comments array found for ${postKey}`);
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
    // Convert date strings to Date objects
    return posts.map((post: any) => ({
      ...post,
      createdAt: new Date(post.createdAt)
    }));
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
    images?: string[];
    tags?: string[];
    category?: string;
  }): Post {
    const posts = PostService.getPostsFromStorage();
    
    const newPost = {
      id: String(Date.now()),
      title: postData.title,
      content: postData.content,
      author: postData.author,
      createdAt: new Date().toISOString(),
      likes: 0,
      images: postData.images || [],
      tags: postData.tags || [],
      category: postData.category || 'General',
      comments: []
    };
    
    // Add the new post to the beginning of the array
    const updatedPosts = [newPost, ...posts];
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
    
    // Return with proper Date object
    return {
      ...newPost,
      createdAt: new Date(newPost.createdAt)
    };
  }

  static likePost(id: string): void {
    const posts = PostService.getPostsFromStorage();
    const updatedPosts = posts.map(post => 
      post.id === id ? { ...post, likes: post.likes + 1 } : post
    );
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
  }

  static addComment(postId: string, text: string, postedBy: string): void {
    const posts = PostService.getPostsFromStorage();
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const comments = post.comments || [];
        return {
          ...post,
          comments: [...comments, { text, postedBy }]
        };
      }
      return post;
    });
    
    // Save back to localStorage
    PostService.savePostsToStorage(updatedPosts);
  }
}
