import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post } from '../models/Post';
import { logger } from '../utils/logger';
import { PostService } from '../services/PostService';
import { PostItem } from '../components/Posts/PostItem';
import { PostForm } from '../components/Posts/PostForm';
import { useNavigate } from 'react-router-dom';
import { Edit, X, Download, PlusSquare } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function MyPostsPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.loading) {
      logger.info('User not authenticated, redirecting to login');
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.loading, navigate]);

  useEffect(() => {
    if (authState.currentUser) {
      loadUserPosts();
    } else if (!authState.loading) {
      setLoading(false);
    }
  }, [authState.currentUser, authState.loading]);

  const loadUserPosts = () => {
    try {
      setLoading(true);
      if (!authState.currentUser) {
        setLoading(false);
        return;
      }
      
      logger.info('Loading user posts', { userId: authState.currentUser.studentId });
      const userPosts = PostService.getPostsByUser(authState.currentUser.studentId);
      logger.debug('User posts loaded', { count: userPosts.length });
      setPosts(userPosts);
      setLoading(false);
    } catch (err) {
      logger.error('Error loading user posts', { error: err });
      setError('Failed to load your posts. Please try again later.');
      setLoading(false);
    }
  };

  const handleEditPost = (post: Post) => {
    logger.info('Editing post', { postId: post.id });
    setEditingPost(post);
    setShowNewPostForm(false);
  };

  const handleUpdatePost = (updatedPostData: any) => {
    if (!editingPost) return;
    
    logger.info('Updating post', { postId: editingPost.id });
    PostService.updatePost(editingPost.id, updatedPostData);
    setEditingPost(null);
    loadUserPosts();
  };

  const handleCreatePost = (postData: any) => {
    logger.info('Creating new post', { title: postData.title });
    PostService.createPost(postData);
    setShowNewPostForm(false);
    loadUserPosts();
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
  };

  const handleCancelNewPost = () => {
    setShowNewPostForm(false);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Posts</h1>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowNewPostForm(true)}
            variant="default"
            size="default"
            title="Create a new post"
          >
            <PlusSquare className="h-4 w-4 mr-2" />
            <span>New Post</span>
          </Button>
          <Button 
            onClick={() => PostService.downloadPostsBackup()}
            variant="outline"
            size="default"
            title="Download your posts as a backup file"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Backup Posts</span>
          </Button>
        </div>
      </div>
      
      {/* New Post Form */}
      {showNewPostForm && (
        <div className="bg-card p-4 rounded-lg border border-border/40 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Create New Post</h2>
            <Button 
              onClick={handleCancelNewPost}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <PostForm 
            onSubmit={handleCreatePost} 
            onCancel={handleCancelNewPost}
            submitLabel="Create Post"
          />
        </div>
      )}
      
      {/* Edit Post Form */}
      {editingPost && (
        <div className="bg-card p-4 rounded-lg border border-border/40 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Edit Post</h2>
            <Button 
              onClick={handleCancelEdit}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <PostForm 
            onSubmit={handleUpdatePost} 
            onCancel={handleCancelEdit}
            initialValues={{
              title: editingPost.title || '',
              content: editingPost.content,
              category: editingPost.category || 'General',
              tags: editingPost.tags ? editingPost.tags.join(', ') : ''
            }}
            submitLabel="Update Post"
          />
        </div>
      )}
      
      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You haven't created any posts yet.
            </p>
            {!showNewPostForm && (
              <Button
                onClick={() => setShowNewPostForm(true)}
                variant="default"
                size="default"
                className="mx-auto flex items-center gap-2"
              >
                <PlusSquare className="h-4 w-4 mr-2" />
                <span>Create Your First Post</span>
              </Button>
            )}
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="relative">
              <Button
                onClick={() => handleEditPost(post)}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-background/80 p-1 rounded-md hover:bg-accent z-10"
                title="Edit post"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <PostItem
                post={post}
                onLike={(id, userId) => {
                  PostService.likePost(id, userId);
                  loadUserPosts();
                }}
                onComment={(postId, text, user) => {
                  PostService.addComment(postId, text, user);
                  loadUserPosts();
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}