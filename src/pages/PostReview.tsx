import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PostReviewList } from '../components/Posts/PostReviewList';
import { Post, PostStatus } from '../models/Post';
import { logger } from '../utils/logger';
import { PostService } from '../services/PostService';
import { User } from '../models/User';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { SearchInput } from '../components/ui/search-input';

const statusLabels: Record<PostStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired'
};

export default function PostReviewPage() {
  const { authState } = useAuth();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeStatus, setActiveStatus] = React.useState<PostStatus>('pending');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Function to filter posts based on status and search query
  const filterPosts = React.useCallback(() => {
    let filtered = [...posts];

    logger.debug(`Filtering ${posts.length} posts by status: ${activeStatus}`);

    // Filter by status
    filtered = filtered.filter(post => {
      const postStatus = (post.status || '').toLowerCase() as PostStatus;
      return postStatus === activeStatus.toLowerCase();
    });

    logger.debug(`After status filter: ${filtered.length} posts remain`);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title?.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
      logger.debug(`After search filter: ${filtered.length} posts remain`);
    }

    setFilteredPosts(filtered);
  }, [posts, activeStatus, searchQuery]);

  // Effect to fetch posts on component mount
  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!authState.currentUser) {
          throw new Error('User not authenticated');
        }

        logger.debug('Fetching all posts for review');
        const allPosts = await PostService.getAllPosts();
        logger.debug(`Fetched ${allPosts.length} posts for review`, {
          firstPostId: allPosts.length > 0 ? allPosts[0].id : 'none',
          statuses: allPosts.map(p => p.status)
        });
        setPosts(allPosts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
        setError(errorMessage);
        logger.error('Error fetching posts:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [authState.currentUser]);

  // Effect to filter posts when dependencies change
  React.useEffect(() => {
    filterPosts();
  }, [filterPosts]);

  // Debug log effect
  React.useEffect(() => {
    if (!loading && filteredPosts) {
      logger.debug(`PostReview: ${filteredPosts.length} posts to display`, {
        activeStatus,
        searchQuery: searchQuery ? searchQuery : 'none',
        firstPostId: filteredPosts.length > 0 ? filteredPosts[0].id : 'none'
      });
    }
  }, [filteredPosts, activeStatus, searchQuery, loading]);

  // Handler functions
  const handleApprove = async (postId: string, comment: string) => {
    try {
      if (!authState.currentUser) {
        throw new Error('User not authenticated');
      }

      const moderator = authState.currentUser as User;
      const updatedPost = await PostService.approvePost(
        postId,
        moderator,
        comment
      );
      if (updatedPost) {
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? updatedPost : post
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve post';
      logger.error('Error approving post:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleReject = async (postId: string, comment: string) => {
    try {
      if (!authState.currentUser) {
        throw new Error('User not authenticated');
      }

      const moderator = authState.currentUser as User;
      const updatedPost = await PostService.rejectPost(
        postId,
        moderator,
        comment
      );
      if (updatedPost) {
        setPosts(prevPosts => prevPosts.map(post =>
          post.id === postId ? updatedPost : post
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject post';
      logger.error('Error rejecting post:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status as PostStatus);
  };

  const handleForceReload = async () => {
    try {
      setLoading(true);
      logger.debug('Force reloading posts from JSON');
      const reloadedPosts = await PostService.forceReloadFromJson();
      logger.debug(`Reloaded ${reloadedPosts.length} posts from JSON`);
      setPosts(reloadedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload posts';
      setError(errorMessage);
      logger.error('Error reloading posts:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Determine the posts to display
  const postsToDisplay = filteredPosts;

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  // Render main UI
  return (
    // Use a container that allows the header to be sticky and content to scroll
    <div className="flex flex-col h-screen max-w-full">
      {/* Sticky header section: Contains title, search, and tabs list */}
      <div className="sticky top-0 z-20 bg-background pt-3 pb-1 px-2 shadow-sm border-b border-border/40">
        {/* Top row: Title and user info */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Review Posts</h1>
          <div className="flex items-center gap-3">
            <div className="w-64 mr-2">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                wrapperClassName="w-full"
              />
            </div>
            {/* Show user info */}
            {authState.currentUser && (
              <div className="text-sm font-medium hidden sm:block">
                <span className="font-bold">{authState.currentUser.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs List - Part of the sticky header */}
        {/* Use Tabs component for state management but only render TabsList here */}
        <Tabs value={activeStatus} onValueChange={handleStatusChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(statusLabels)
              .filter(([status]) => ['pending', 'approved', 'rejected'].includes(status)) // Only show main review statuses
              .map(([status, label]) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {/* Use the label from statusLabels, fallback to capitalized status */}
                  {statusLabels[status as PostStatus] || status.charAt(0).toUpperCase() + status.slice(1)}
                </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 scrollable-content px-2 pt-4 pb-20">
        {/* Post list */}
        <div className="space-y-4">
          {postsToDisplay.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchQuery
                ? 'No posts match your search.'
                : `No ${statusLabels[activeStatus].toLowerCase()} posts found.`}
            </p>
          ) : (
            <>
              <PostReviewList
                posts={postsToDisplay}
                onApprove={handleApprove}
                onReject={handleReject}
              />
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-2 bg-muted text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <p>Debug: {postsToDisplay.length} posts to display</p>
                    <button
                      type="button"
                      onClick={handleForceReload}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Force Reload'}
                    </button>
                  </div>
                  {postsToDisplay.length > 0 && (
                    <p>First post: {postsToDisplay[0].id} - {postsToDisplay[0].title}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
