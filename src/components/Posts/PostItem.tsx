import React, { useState, useEffect } from 'react';
import { Post } from '../../models/Post';
import { ThumbsUp, Tag, ChevronDown, ChevronUp, Share2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { getCategoryFallbackImage } from '../../lib/imageUtils';

interface PostItemProps {
  post: Post;
  onLike: (id: string) => void;
  onComment?: (id: string, text: string, author: string) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, onLike, onComment }) => {
  const [expanded, setExpanded] = useState(false);
  // Always keep comments minimized by default
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [imageError, setImageError] = useState(false);
  
  // Debug log when post is rendered
  useEffect(() => {
    // Check if post has comments
    console.log(`Post ${post.id} (${post.title}) details:`, {
      hasComments: Boolean(post.comments && post.comments.length > 0),
      commentCount: post.comments?.length || 0,
      comments: post.comments
    });
  }, [post]);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Determine if the content needs to be truncated
  const hasLongContent = post.content.length > 200;
  const displayContent = expanded || !hasLongContent 
    ? post.content 
    : post.content.substring(0, 200) + '...';

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && commentAuthor.trim() && onComment) {
      onComment(post.id, commentText, commentAuthor);
      setCommentText('');
      setCommentAuthor('');
    }
  };

  // Handle image load error by using a fallback
  const handleImageError = () => {
    console.error(`Failed to load image: ${post.image}`);
    setImageError(true);
  };

  // Get the image source with fallback handling
  const getImageSrc = () => {
    if (imageError || !post.image) {
      return getCategoryFallbackImage(post.category);
    }
    return post.image;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{post.title}</h2>
      
      {/* Show image with error handling */}
      <div className="overflow-hidden">
        {post.image || imageError ? (
          <img 
            src={getImageSrc()}
            alt={post.title} 
            className="h-40 w-full object-cover rounded-md"
            onError={handleImageError}
          />
        ) : (
          <div className="flex items-center justify-center h-40 w-full bg-muted rounded-md">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div 
        className={`text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}
        dangerouslySetInnerHTML={{ __html: displayContent }}
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
      
      <div className="flex flex-wrap gap-2">
        {/* Show category if available */}
        {post.category && (
          <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
            <Tag className="w-3 h-3" />
            {post.category}
          </span>
        )}
        
        {/* Show tags if available */}
        {post.tags && post.tags.length > 0 && (
          post.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))
        )}
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t border-border/40">
        <div>
          <span className="text-sm font-medium mr-2">By {post.author}</span>
          <span className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</span>
        </div>
        <div className="flex gap-3">
          <button 
            className="text-sm hover:text-primary flex items-center gap-1"
            onClick={() => onLike(post.id)}
          >
            <ThumbsUp className={`w-4 h-4 ${post.likes > 0 ? 'text-primary' : ''}`} />
            <span>{post.likes}</span>
          </button>
          <button 
            className={`text-sm hover:text-primary flex items-center gap-1 ${post.comments && post.comments.length > 0 ? 'text-primary font-medium' : ''}`}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className={`w-4 h-4 ${post.comments && post.comments.length > 0 ? 'text-primary' : ''}`} />
            <span>{post.comments?.length || 0}</span>
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
          <h3 className="text-sm font-semibold">Comments ({post.comments?.length || 0})</h3>
          
          <div className="space-y-3">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment, index) => (
                <div key={index} className="bg-background p-3 rounded-md border border-border/40">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Posted by {comment.postedBy}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
          </div>
          
          {/* Add comment form */}
          {onComment && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-border/40 bg-background rounded-md"
                  required
                />
              </div>
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
                >
                  Post comment
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
