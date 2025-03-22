import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { PostItem } from './PostItem';
import { PostForm } from './PostForm';
import { PostService } from '../../services/PostService';
import { Post } from '../../models/Post';
import './Posts.css';

export const PostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Function to refresh posts from storage
  const refreshPosts = () => {
    const fetchedPosts = PostService.getAllPosts();
    setPosts(fetchedPosts);
  };

  useEffect(() => {
    // Load posts when component mounts
    refreshPosts();
  }, []);

  const handleCreatePost = (postData: {
    title: string;
    content: string;
    author: string;
    images?: string[];
    tags?: string[];
    category?: string;
  }) => {
    PostService.createPost(postData);
    refreshPosts();
    setShowForm(false);
  };

  const handleLikePost = (id: string) => {
    PostService.likePost(id);
    refreshPosts();
  };

  const handleAddComment = (postId: string, text: string, author: string) => {
    PostService.addComment(postId, text, author);
    refreshPosts();
  };

  // Function to reset posts from JSON
  const handleReset = () => {
    PostService.resetStorage();
    refreshPosts();
  };

  // Get unique categories from posts
  const categories = ['All', ...new Set(posts.map(post => post.category).filter(Boolean))];

  // Filter posts based on search term and category
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === 'All' || post.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="posts-page">
      <h1>Community Posts</h1>
      
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mr-2 px-3 py-2 border rounded-md"
        />
        
        {/* Add category filter */}
        <select
          data-testid="category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="mr-2 px-3 py-2 border rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            cat && <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-red-500 text-white rounded-md mr-2"
        >
          Reset
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md"
        >
          <PlusCircle className="w-4 h-4" />
          New Post
        </button>
      </div>
      
      {showForm && (
        <div className="mb-4 p-4 border rounded-lg">
          <PostForm 
            onSubmit={handleCreatePost} 
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
      
      <div className="posts-list">
        <h2>Recent Posts</h2>
        {filteredPosts.length === 0 ? (
          <p>No posts yet. Be the first to post!</p>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="mb-4 p-4 border rounded-lg">
              <PostItem 
                post={post} 
                onLike={handleLikePost}
                onComment={handleAddComment}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
