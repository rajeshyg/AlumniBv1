import React, { useState, useEffect } from 'react';
import { Post } from '../../models/Post';
import { ThumbsUp, Tag, ChevronDown, ChevronUp, Share2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { getCategoryFallbackImage } from '../../lib/imageUtils';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { StatusBadge } from '../ui/status-badge';

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
  const [imageLoading, setImageLoading] = useState(true);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
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

  // Check if deadline is within 7 days
  const isDeadlineSoon = (date: Date): boolean => {
    const today = new Date();
    const deadlineDate = new Date(date);
    const daysRemaining = differenceInDays(deadlineDate, today);
    return daysRemaining >= 0 && daysRemaining <= 7;
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
      fallbackCategory: post.category,
      organization: post.organization
    });
    setImageError(true);
    setImageLoading(false);
  };

  // Get the image source with fallback handling
  const getImageSrc = () => {
    if (imageError || !post.image) {
      const fallbackImage = getCategoryFallbackImage(post.category, post.organization);
      logger.debug(`Using fallback image for ${post.title}`, {
        category: post.category,
        organization: post.organization,
        fallbackImage
      });
      return fallbackImage;
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
    <article
      data-testid={`post-${post.id}`}
      className="post-card"
      tabIndex={0}
      aria-label={`Post: ${post.title}`}
    >
      {/* Status Indicator */}
      <StatusBadge status={post.status.toLowerCase() as any} position="absolute" />
      {/* Image Section */}
      <div className="md:w-56 w-full flex-shrink-0 bg-muted rounded-t-xl md:rounded-l-xl md:rounded-tr-none overflow-hidden border border-border/30 md:h-full md:min-h-[16rem] relative">
        <div className="w-full h-full flex items-center justify-center relative">
          {post.image || imageError ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
              <img
                src={getImageSrc()}
                alt={post.title}
                className={`object-contain w-full h-40 md:h-full rounded-t-xl md:rounded-l-xl md:rounded-tr-none cursor-pointer hover:scale-105 transition-all duration-300 ease-in-out ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onError={handleImageError}
                onLoad={() => setImageLoading(false)}
                onClick={() => setShowImagePreview(true)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-muted/30">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground text-center">No image available</span>
              {post.organization && (
                <span className="text-sm font-medium text-primary/70 mt-2 text-center">{post.organization}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="post-content">
        {/* Organization (if available) */}
        {post.organization && (
          <div className="text-sm font-medium text-primary/80 mb-1">
            {post.organization}
          </div>
        )}

        {/* Title */}
        <h2 className="post-title cursor-pointer" onClick={() => setExpanded(!expanded)} title="Click to expand/collapse content">{post.title}</h2>

        {/* Description */}
        <div
          className={`post-description ${expanded ? '' : 'line-clamp-3'}`}
          dangerouslySetInnerHTML={{ __html: displayContent || '' }}
        />

        {/* Application URL */}
        {post.applicationUrl && (
          <div className="mt-2">
            <a
              href={post.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Apply Now
            </a>
          </div>
        )}

        {/* Contact Info */}
        {post.contactInfo && (
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium">Contact: </span>
            {post.contactInfo}
          </div>
        )}

        {hasLongContent && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary flex items-center gap-1 hover:underline focus-visible:underline"
            aria-label={expanded ? 'Show less content' : 'Read more content'}
          >
            {expanded ?
              <><ChevronUp className="w-4 h-4" /> <span>Show less</span></> :
              <><ChevronDown className="w-4 h-4" /> <span>Read more</span></>
            }
          </button>
        )}

        {/* Post Type Badge (if available) */}
        {post.postType && (
          <div className="mt-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${post.postType === 'offering' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : post.postType === 'seeking' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'}`}>
              {post.postType === 'offering' ? 'Offering Help' : post.postType === 'seeking' ? 'Seeking Help' : 'General'}
            </span>
            {post.isUrgent && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                Urgent
              </span>
            )}
          </div>
        )}

        {/* Tags & Category */}
        <div className="flex flex-wrap gap-2 mt-1" data-testid="post-tags">
          {post.category && (
            <div className="tooltip">
              <span className="post-category-tag">
                <Tag className="w-3 h-3" />
                {post.category}
              </span>
              <span className="tooltip-text">Category</span>
            </div>
          )}

          {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && post.tags.map(tag => (
            <div key={tag} className="tooltip">
              <span className="post-regular-tag">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
              <span className="tooltip-text">Tag</span>
            </div>
          ))}
        </div>

        {/* Remove redundant category/tag text display */}

        {/* Metadata */}
        <div className="post-metadata">
          <span>
            <span className="sr-only">Posted on:</span>
            <span aria-hidden="true">🕒</span> {formatDate(post.createdAt)}
          </span>
          <span>
            <span className="sr-only">Author:</span>
            <span aria-hidden="true">✍️</span> {post.author}
          </span>
          {post.location && (
            <span>
              <span className="sr-only">Location:</span>
              <span aria-hidden="true">📍</span> {post.location}
            </span>
          )}
          {post.deadline && (
            <span className={`flex items-center gap-1 ${isDeadlineSoon(post.deadline) ? 'text-destructive font-medium' : ''}`}>
              <span className="sr-only">Deadline:</span>
              <span aria-hidden="true">⏰</span> {formatDate(post.deadline)}
              {isDeadlineSoon(post.deadline) && (
                <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                  Soon
                </span>
              )}
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex gap-4 mt-3 items-center border-t border-border/30 pt-3">
          <button
            type="button"
            className={`post-action-button ${hasLiked ? 'post-action-button-active' : 'text-foreground'}`}
            onClick={handleLike}
            aria-label={hasLiked ? 'Unlike this post' : 'Like this post'}
            title={hasLiked ? 'Unlike' : 'Like'}
          >
            <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-primary' : ''}`} />
            <span>{post.likes}</span>
            <span className="hidden sm:inline">Like</span>
          </button>

          <button
            type="button"
            className={`post-action-button ${showComments ? 'post-action-button-active' : 'text-foreground'}`}
            onClick={() => setShowComments(!showComments)}
            aria-label={`${showComments ? 'Hide' : 'Show'} ${post.comments?.length || 0} comments`}
            data-testid="comments-button"
            title={showComments ? 'Hide comments' : 'Show comments'}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments?.length || 0}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>

          <button
            type="button"
            className="post-action-button text-foreground"
            aria-label="Share this post"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
            <h3 className="text-sm font-semibold">Comments ({sortedComments.length})</h3>

            <div className="space-y-3">
              {sortedComments.length > 0 ? (
                <>
                  {commentsToShow.map((comment, index) => (
                    <div key={index} className="post-comment">
                      <p className="text-sm">{comment.text}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">Posted by {comment.postedBy}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt))} ago</p>
                      </div>
                    </div>
                  ))}

                  {hasMoreComments && (
                    <button
                      type="button"
                      onClick={() => setShowAllComments(!showAllComments)}
                      className="w-full mt-2 p-2 text-sm text-primary hover:bg-primary/5 rounded-md flex items-center justify-center gap-1"
                      aria-label={showAllComments ? 'Show fewer comments' : `View all ${sortedComments.length} comments`}
                    >
                      {showAllComments ?
                        <><ChevronUp className="w-4 h-4" /> Show fewer comments</> :
                        <><ChevronDown className="w-4 h-4" /> View all {sortedComments.length} comments</>
                      }
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
                  <label htmlFor={`comment-${post.id}`} className="sr-only">Write a comment</label>
                  <textarea
                    id={`comment-${post.id}`}
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-border/40 bg-background rounded-md focus:ring-2 focus:ring-primary/60 focus:outline-none transition-colors"
                    rows={2}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="button-3d py-1 px-3"
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

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="relative max-w-full max-h-full bg-background/10 p-1 rounded-lg">
            <button
              type="button"
              className="absolute top-2 right-2 bg-background rounded-full p-1 hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowImagePreview(false);
              }}
              aria-label="Close preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <img
              src={getImageSrc()}
              alt={post.title}
              className="max-w-full max-h-[90vh] object-contain rounded-md"
            />
          </div>
        </div>
      )}
    </article>
  );
};
