import React, { useState, useEffect } from 'react';
import { Post } from '../models/Post';
import { PostService } from '../services/PostService';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { Search, PlusSquare, X, RefreshCw } from 'lucide-react';
import { TabNavigation, Tab } from '../components/shared/TabNavigation';

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Define category tabs
  const categoryTabs: Tab[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'Internships', label: 'Internships' },
    { id: 'Admissions', label: 'Admissions' },
    { id: 'Scholarships', label: 'Scholarships' },
    { id: 'General', label: 'General' }
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, activeTab]);

  const loadPosts = () => {
    const allPosts = PostService.getAllPosts();
    setPosts(allPosts);
  };

  const filterPosts = () => {
    let filtered = [...posts];
    
    // Filter by category tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(post => post.category === activeTab);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(query) || 
        post.content.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    setFilteredPosts(filtered);
  };

  const handleCreatePost = (postData: any) => {
    PostService.createPost(postData);
    loadPosts();
    setShowForm(false);
  };

  const handleLikePost = (id: string) => {
    PostService.likePost(id);
    loadPosts();
  };

  const handleAddComment = (postId: string, text: string, postedBy: string) => {
    PostService.addComment(postId, text, postedBy);
    loadPosts();
  };

  const handleResetPosts = () => {
    PostService.resetStorage();
    loadPosts();
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  console.log("Rendering Posts page with tab navigation");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Community Posts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <PlusSquare className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Post'}
          </button>
          <button
            onClick={handleResetPosts}
            className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm"
            title="Reload posts from JSON data"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card p-6 rounded-lg border border-border/40">
          <PostForm onSubmit={handleCreatePost} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Tab navigation positioned above the search */}
      <TabNavigation 
        tabs={categoryTabs} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      {/* Search bar - standalone without dropdown */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-border/40 bg-background rounded-md"
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
        {filteredPosts.length > 0 ? (
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-card p-6 rounded-lg border border-border/40">
                <PostItem 
                  post={post} 
                  onLike={handleLikePost} 
                  onComment={handleAddComment}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card p-6 rounded-lg border border-border/40 text-center">
            <p className="text-muted-foreground">No posts found. Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
