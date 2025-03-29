import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PostReviewList } from '../components/Posts/PostReviewList';
import { Post } from '../models/Post';
import { logger } from '../utils/logger';
import { PostService } from '../services/PostService';
import { User } from '../models/User';

export default function PostReviewPage() {
  const { authState } = useAuth();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (!authState.currentUser) {
          throw new Error('User not authenticated');
        }

        const pendingPosts = await PostService.getPostsByStatus('pending');
        setPosts(pendingPosts);
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Review Posts</h1>
      <PostReviewList 
        posts={posts} 
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
} 