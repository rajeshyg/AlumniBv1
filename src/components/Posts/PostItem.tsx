import React, { useState, useEffect } from 'react';
import { Post } from '../../models/Post';
import { ThumbsUp, Tag, ChevronDown, ChevronUp, Share2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { getCategoryFallbackImage } from '../../lib/imageUtils';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { formatDistanceToNow } from 'date-fns';

interface PostItemProps {
  post: Post;
  onLike: (id: string, userId: string) => void;
  onComment?: (id: string, text: string, user: any) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onLike, onComment }) => {
  // Add safety check for invalid post object
  if (!post || typeof post !== 'object') {
    logger.error('Invalid post object received', { post });
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-500">Error: Invalid post data</p>
      </div>
    );
  }

  const { authState } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [imageError, setImageError] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const PREVIEW_COMMENTS_COUNT = 2;
  
  // Determine if current user has liked this post
  const hasLiked = post.likedBy?.includes(authState.currentUser?.studentId || '');
  
  // Replace console.log with structured logger
  useEffect(() => {
    logger.debug(`Rendering post ${post.id}`, {
      title: post.title || 'No title',
      author: post.author || 'Unknown',
      hasComments: post.comments && post.comments.length > 0,
      commentCount: post.comments?.length || 0,
      category: post.category || 'Uncategorized'
    });
  }, [post]);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Determine if the content needs to be truncated - add null check for content
  const hasLongContent = post.content?.length > 200 || false;
  const displayContent = expanded || !hasLongContent 
    ? post.content || '' 
    : (post.content || '').substring(0, 200) + '...';

  const handleLike = () => {
    if (authState.currentUser) {
      onLike(post.id, authState.currentUser.studentId);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && onComment && authState.currentUser) {
      onComment(post.id, commentText, authState.currentUser);
      setCommentText('');
    }
  };

  // Handle image load error with proper logging
  const handleImageError = () => {
    logger.error(`Failed to load image for post ${post.id}`, { 
      imageUrl: post.image,
      postTitle: post.title,
      fallbackCategory: post.category
    });
    setImageError(true);
  };

  // Get the image source with fallback handling
  const getImageSrc = () => {
    if (imageError || !post.image) {
      return getCategoryFallbackImage(post.category);
    }
    return post.image;
  };

  // Filter posts that have sortable comments
  const sortedComments = post.comments && Array.isArray(post.comments) && post.comments.length > 0
    ? [...post.comments].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  // Get comments to display based on preview state
  const commentsToShow = showAllComments 
    ? sortedComments 
    : sortedComments.slice(0, PREVIEW_COMMENTS_COUNT);

  const hasMoreComments = sortedComments.length > PREVIEW_COMMENTS_COUNT;

  return (
    <div data-testid={`post-${post.id}`} className="space-y-4">
      <h2 className="text-xl font-semibold">{post.title}</h2>
      
      {/* Show image with error handling */}
      <div className="overflow-hidden">
        {post.image || imageError ? (
          <>
            <img 
              src={getImageSrc()}
              alt={post.title} 
              className="max-h-60 w-full object-contain rounded-md cursor-pointer"
              onError={handleImageError}
              onClick={() => setShowImagePreview(true)}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-40 w-full bg-muted rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-full max-h-full">
            <button 
              className="absolute top-2 right-2 bg-white rounded-full p-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowImagePreview(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <img 
              src={getImageSrc()} 
              alt={post.title}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}

      <div 
        className={`text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}
        dangerouslySetInnerHTML={{ __html: displayContent || '' }}
      />
      
      {hasLongContent && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" /> Read more
            </>
          )}
        </button>
      )}
      
      <div className="flex flex-wrap gap-2" data-testid="post-tags">
        {/* Show category if available */}
        {post.category && (
          <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
            <Tag className="w-3 h-3" />
            {post.category}
          </span>
        )}
        
        {/* Show tags if available */}
        {post.tags && Array.isArray(post.tags) && post.tags.length > 0 ? (
          post.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))
        ) : null}
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t border-border/40">
        <div>
          <span className="text-sm font-medium mr-2">By {post.author}</span>
          <span className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</span>
        </div>
        <div className="flex gap-3">
          <button 
            className={`text-sm hover:text-primary flex items-center gap-1 ${hasLiked ? 'text-primary font-medium' : ''}`}
            onClick={handleLike}
          >
            <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'text-primary fill-primary' : ''}`} />
            <span>{post.likes}</span>
          </button>
          <button 
            className={`text-sm hover:text-primary flex items-center gap-1 ${showComments ? 'text-primary font-medium' : ''}`}
            onClick={() => setShowComments(!showComments)}
            aria-label={`${post.comments?.length || 0} comments`}
            data-testid="comments-button"
          >
            <MessageCircle className={`w-4 h-4 ${(post.comments && post.comments.length > 0) ? 'text-primary' : ''}`} />
            <span>{post.comments?.length || 0} Comments</span>
          </button>
          <button className="text-sm hover:text-primary flex items-center gap-1">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
      
      {/* Make comment visibility indicator clearer */}
      {post.comments && post.comments.length > 0 && (
        <div 
          onClick={() => setShowComments(!showComments)}
          className="mt-2 p-2 bg-primary/5 rounded-md cursor-pointer text-center hover:bg-primary/10"
        >
          <p className="text-sm flex items-center justify-center gap-1">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="font-medium">{post.comments.length} comments</span> - Click to {showComments ? 'hide' : 'view'}
          </p>
        </div>
      )}
      
      {/* Comments section */}
      {showComments && (
        <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
          <h3 className="text-sm font-semibold">
            Comments ({sortedComments.length})
          </h3>
          
          <div className="space-y-3">
            {sortedComments.length > 0 ? (
              <>
                {commentsToShow.map((comment, index) => (
                  <div 
                    key={index} 
                    className="bg-background p-3 rounded-md border border-border/40"
                    data-testid={`comment-${index}`}
                  >
                    <p className="text-sm">{comment.text}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">
                        Posted by {comment.postedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                      </p>
                    </div>
                  </div>
                ))}

                {hasMoreComments && (
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="w-full mt-2 p-2 text-sm text-primary hover:bg-primary/5 rounded-md flex items-center justify-center gap-1"
                  >
                    {showAllComments ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> Show fewer comments
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> 
                        View all {sortedComments.length} comments
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
          </div>

          {/* Comment form */}
          {onComment && authState.isAuthenticated && (
            <form onSubmit={handleSubmitComment} className="space-y-3 mt-4">
              <div>
                <textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-border/40 bg-background rounded-md"
                  rows={2}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md"
                  disabled={!commentText.trim()}
                >
                  Post comment
                </button>
              </div>
            </form>
          )}

          {/* Show login message if not authenticated */}
          {!authState.isAuthenticated && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-center">Please log in to comment</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
