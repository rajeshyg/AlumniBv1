import React, { useState, useEffect } from 'react';
import { Post } from '../models/Post';
import { PostService } from '../services/PostService';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { Search, PlusSquare, X, RefreshCw } from 'lucide-react';
import { TabNavigation, Tab } from '../components/shared/TabNavigation';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';

export default function Posts() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.loading) {
      logger.info('User not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.loading, navigate]);

  // Define category tabs
  const categoryTabs: Tab[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'Internships', label: 'Internships' },
    { id: 'Admissions', label: 'Admissions' },
    { id: 'Scholarships', label: 'Scholarships' },
    { id: 'General', label: 'General' }
  ];

  useEffect(() => {
    logger.info('Posts component mounted, loading posts');
    loadPosts();
  }, []);

  useEffect(() => {
    logger.debug('Filter criteria changed, updating filtered posts', {
      searchQuery,
      activeTab,
      totalPosts: posts.length
    });
    filterPosts();
  }, [posts, searchQuery, activeTab]);

  const loadPosts = () => {
    logger.info('Loading posts from service');
    const allPosts = PostService.getAllPosts();
    logger.debug('Posts loaded successfully', { count: allPosts.length });
    setPosts(allPosts);
  };

  const filterPosts = () => {
    logger.debug('Filtering posts', { activeTab, searchQueryLength: searchQuery.length });
    let filtered = [...posts];
    
    // Filter by category tab
    if (activeTab !== 'all') {
      logger.debug(`Filtering by category: ${activeTab}`);
      filtered = filtered.filter(post => post.category === activeTab);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logger.debug(`Filtering by search query: ${query}`);
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(query) || 
        post.content.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    logger.debug('Filter results', { 
      beforeCount: posts.length, 
      afterCount: filtered.length 
    });
    
    setFilteredPosts(filtered);
  };

  const handleCreatePost = (postData: any) => {
    logger.info('Creating new post', { title: postData.title, category: postData.category });
    PostService.createPost(postData);
    logger.debug('Post created successfully');
    loadPosts();
    setShowForm(false);
  };

  const handleLikePost = (id: string, userId: string) => {
    logger.debug('Liking post', { postId: id, userId });
    PostService.likePost(id, userId);
    loadPosts();
  };

  const handleAddComment = (postId: string, text: string, user: any) => {
    logger.debug('Adding comment to post', { 
      postId, 
      commentLength: text.length,
      userId: user.studentId
    });
    PostService.addComment(postId, text, user);
    loadPosts();
  };

  const handleResetPosts = () => {
    logger.info('Resetting posts storage to default data');
    PostService.resetStorage();
    loadPosts();
  };

  const handleTabChange = (tabId: string) => {
    logger.debug(`Changing active tab to: ${tabId}`);
    setActiveTab(tabId);
  };

  // Show loading state
  if (authState.loading) {
    logger.debug('Auth state is loading, showing loading indicator');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-full">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background pt-4 pb-2 px-2 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Community Posts</h1>
          <div className="flex items-center gap-2">
            {/* Show user info */}
            {authState.currentUser && (
              <div className="text-sm font-medium mr-2 hidden sm:block">
                <span className="font-bold">{authState.currentUser.name}</span>
              </div>
            )}
            
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm"
            >
              {showForm ? <X className="w-4 h-4" /> : <PlusSquare className="w-4 h-4" />}
              {showForm ? 'Cancel' : 'New Post'}
            </button>
            
            <button
              onClick={handleResetPosts}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm"
              title="Reload posts from JSON data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation with overflow scroll */}
        <div className="overflow-x-auto -mx-2 px-2">
          <TabNavigation 
            tabs={categoryTabs} 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
          />
        </div>

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
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-2 pt-4 pb-20">
        {showForm && (
          <div className="bg-card p-4 rounded-lg border border-border/40 mb-6">
            <PostForm onSubmit={handleCreatePost} onCancel={() => setShowForm(false)} />
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
          {filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div key={post.id} className="bg-card p-4 rounded-lg border border-border/40">
                  <PostItem 
                    post={post} 
                    onLike={handleLikePost} 
                    onComment={handleAddComment}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card p-4 rounded-lg border border-border/40 text-center">
              <p className="text-muted-foreground">No posts found. Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}