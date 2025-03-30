import React, { useState, useEffect } from 'react';
import { Post } from '../models/Post';
import { PostService } from '../services/PostService';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { Search, PlusSquare, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import { TabNavigation } from '../components/shared/TabNavigation';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const categoryLabels = {
  all: { label: 'All Categories', value: 'all' },
  internships: { label: 'Internships', value: 'Internships' },
  admissions: { label: 'Admissions', value: 'Admissions' },
  scholarships: { label: 'Scholarships', value: 'Scholarships' },
  general: { label: 'General', value: 'General' }
};

const getCategoryLabel = (value: string): string => {
  // First try to find category by value
  const category = Object.values(categoryLabels).find(cat => 
    cat.value.toLowerCase() === value.toLowerCase());
  
  if (category) {
    return category.label;
  }
  
  // Then try to find by key
  const key = Object.keys(categoryLabels).find(key => 
    key.toLowerCase() === value.toLowerCase());
  
  if (key) {
    return categoryLabels[key as keyof typeof categoryLabels].label;
  }
  
  // If all else fails, just return the value
  return value;
};

const Posts: React.FC = () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      // Add the code that's likely causing the error
      const tabs = Object.values(categoryLabels);
      logger.debug('Tab values:', { 
        tabValues: tabs.map(tab => typeof tab === 'object' ? JSON.stringify(tab) : tab)
      });
    } catch (error) {
      logger.error('Error in Posts component:', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  const { authState } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // Keep track of the active tab value

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.loading) {
      logger.info('User not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.loading, navigate]);

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

  const loadPosts = async () => {
    logger.info('Loading posts from service');
    try {
      let allPosts = await PostService.getAllPosts();
      if (allPosts.length === 0) {
        logger.info('No posts found in storage, attempting to force reload from JSON');
        allPosts = await PostService.forceReloadFromJson();
      }
      logger.debug('Posts loaded successfully', { count: allPosts.length });
      setPosts(allPosts);
      setFilteredPosts(allPosts);
    } catch (error) {
      logger.error('Error loading posts:', error);
      setPosts([]);
      setFilteredPosts([]);
    }
  };

  const filterPosts = () => {
    if (!Array.isArray(posts)) {
      logger.error('Posts is not an array, cannot filter');
      setFilteredPosts([]);
      return;
    }
    let filtered = [...posts];
    
    // Filter by category tab
    if (activeTab !== 'all') {
      logger.debug(`Filtering by category: ${activeTab}`, { activeTab, postsLength: filtered.length });
      filtered = filtered.filter(post => {
        const postCategory = post.category?.toString() || '';
        const tabValue = activeTab?.toString() || '';
        return postCategory.toLowerCase() === tabValue.toLowerCase();
      });
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
    // Reset storage and force reload from JSON
    PostService.resetStorage();
    const posts = PostService.forceReloadFromJson();
    setPosts(posts);
    setFilteredPosts(posts);
    logger.debug('Posts reset successfully', { count: posts.length });
  };

  const handleTabChange = (value: string) => {
    logger.debug('Tab changed:', {
      newValue: value,
      previousTab: activeTab,
      categoryLabel: getCategoryLabel(value)
    });
    
    setActiveTab(typeof value === 'string' ? value : 'all');
  };

  // Show loading stateebug 
  if (authState.loading) {
    logger.debug('Auth state is loading, showing loading indicator');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Determine the posts to display based on the active tab
  const postsToDisplay = filteredPosts; // Already filtered by search and category in filterPosts

  logger.debug('Rendering Posts with tabs', {
    tabsCount: Object.values(categoryLabels).length,
    activeTab: typeof activeTab === 'string' ? activeTab : 'unknown'
  });

  if (process.env.NODE_ENV === 'development') {
    try {
      // Add the code that's likely causing the error
      const tabs = Object.values(categoryLabels);
      logger.debug('Tab values:', { 
        tabValues: tabs.map(tab => typeof tab === 'object' ? JSON.stringify(tab) : tab)
      });
    } catch (error) {
      logger.error('Error in Posts component:', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  return (
    // Use a container that allows the header to be sticky and content to scroll
    <div className="flex flex-col h-screen max-w-full"> 
      {/* Sticky header section: Contains title, buttons, search, and tabs list */}
      <div className="sticky top-0 z-20 bg-background pt-4 pb-2 px-2 space-y-4 shadow-sm border-b border-border/40">
        {/* Top row: Title and buttons */}
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

        {/* Search bar */}
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

        {/* Tabs List - Part of the sticky header */}
        {/* Use Tabs component for state management but only render TabsList here */}
        <TabNavigation 
          tabs={Object.values(categoryLabels).map(category => ({
            label: category.label,
            value: category.value,
          }))}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Scrollable content area - Takes remaining height */}
      <div className="flex-1 scrollable-content px-2 pt-4 pb-20"> 
        {/* Conditionally render the PostForm */}
        {showForm && (
          <div className="bg-card p-4 rounded-lg border border-border/40 mb-6">
            <PostForm onSubmit={handleCreatePost} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Render the filtered posts */}
        <div className="space-y-4">
          {/* Removed the h2 "Recent Posts" as it was inside TabsContent before */}
          {postsToDisplay.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchQuery 
                ? 'No posts match your search.' 
                : `No posts found in ${getCategoryLabel(activeTab)}.`
              }
            </p>
          ) : (
            postsToDisplay.map(post => (
              <PostItem
                key={post.id}
                post={post}
                onLike={handleLikePost}
                onComment={handleAddComment}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Export a wrapped version of the component
export default function PostsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Posts />
    </ErrorBoundary>
  );
}
