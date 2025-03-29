import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PostReviewList } from '../components/Posts/PostReviewList';
import { Post, PostStatus } from '../models/Post';
import { logger } from '../utils/logger';
import { PostService } from '../services/PostService';
import { User } from '../models/User';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search } from 'lucide-react';

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

  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!authState.currentUser) {
          throw new Error('User not authenticated');
        }

        const allPosts = await PostService.getAllPosts();
        setPosts(allPosts);
        setFilteredPosts(allPosts);
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

  React.useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, activeStatus]);

  const filterPosts = () => {
    let filtered = [...posts];
    
    // Filter by status
    filtered = filtered.filter(post => post.status === activeStatus);
    
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
        setPosts(posts.map(post => 
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
        setPosts(posts.map(post => 
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  // Determine the posts to display based on the active status and search query
  const postsToDisplay = filteredPosts; // Already filtered by status and search in filterPosts

  return (
    // Use a container that allows the header to be sticky and content to scroll
    <div className="flex flex-col h-screen max-w-full"> 
      {/* Sticky header section: Contains title, search, and tabs list */}
      <div className="sticky top-0 z-20 bg-background pt-4 pb-2 px-2 space-y-4 shadow-sm border-b border-border/40">
        {/* Top row: Title and user info */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Review Posts</h1>
          <div className="flex items-center gap-2">
            {/* Show user info */}
            {authState.currentUser && (
              <div className="text-sm font-medium mr-2 hidden sm:block">
                <span className="font-bold">{authState.currentUser.name}</span>
              </div>
            )}
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
        <Tabs value={activeStatus} onValueChange={handleStatusChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(statusLabels)
              .filter(([status]) => ['pending', 'approved', 'rejected'].includes(status)) // Only show main review statuses
              .map(([status, label]) => (
                <TabsTrigger key={status} value={status}>
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
            <PostReviewList 
              posts={postsToDisplay} 
              onApprove={handleApprove} 
              onReject={handleReject} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
