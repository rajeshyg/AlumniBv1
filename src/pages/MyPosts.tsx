import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MyPosts } from '../components/Posts/MyPosts';
import { Post } from '../models/Post';
import { logger } from '../utils/logger';
import { PostService } from '../services/PostService';

export default function MyPostsPage() {
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

        const userPosts = PostService.getPostsByUserAndStatus(authState.currentUser.studentId);
        setPosts(userPosts);
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

  const handleUpdatePost = async (post: Post) => {
    try {
      // Since we're using localStorage, we don't need to make an API call
      // The PostService methods already handle the updates
      setPosts(posts.map(p => 
        p.id === post.id ? post : p
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
      logger.error('Error updating post:', errorMessage);
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
      <h1 className="text-3xl font-bold mb-8">My Posts</h1>
      <MyPosts posts={posts} onUpdatePost={handleUpdatePost} />
    </div>
  );
} 