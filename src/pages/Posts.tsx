import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { PostService } from '../services/PostService';
import { Post } from '../models/Post';

export default function Posts() {
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
    // Wait a bit for localStorage to update
    setTimeout(() => {
      refreshPosts();
      alert('Posts reset from JSON. Comments should now be visible.');
    }, 100);
  };

  // Get unique categories from posts
  const categories = ['All', ...new Set(posts.map(post => post.category).filter(Boolean))];

  // Filter posts based on search term and category
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesCategory = !categoryFilter || categoryFilter === 'All' || post.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <div className="flex gap-2">
          <button 
            className="flex items-center gap-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm"
            onClick={handleReset}
            title="Reset to original posts from JSON"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Posts from JSON</span>
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border/40 bg-background rounded-md"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-border/40 bg-background rounded-md"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              cat && <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      
      {showForm && (
        <div className="bg-card p-6 rounded-lg border border-border/40">
          <PostForm 
            onSubmit={handleCreatePost} 
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        {filteredPosts.map(post => (
          <div key={post.id} className="bg-card p-6 rounded-lg border border-border/40 hover:border-border transition-colors">
            <PostItem 
              post={post} 
              onLike={handleLikePost}
              onComment={handleAddComment}
            />
          </div>
        ))}
      </div>
      
      {filteredPosts.length === 0 && (
        <div className="bg-card p-8 rounded-lg border border-border/40 text-center">
          {searchTerm || categoryFilter ? (
            <p className="text-muted-foreground mb-4">
              No posts found matching your criteria
              {searchTerm && <span> "{searchTerm}"</span>}
              {categoryFilter && categoryFilter !== 'All' && <span> in category "{categoryFilter}"</span>}
            </p>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">No posts found</p>
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={() => setShowForm(true)}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create your first post</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
