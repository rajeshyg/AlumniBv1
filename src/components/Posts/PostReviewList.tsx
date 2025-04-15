import React from 'react';
import { Post, PostStatus } from '../../models/Post';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { PostApprovalForm } from './PostApprovalForm';

interface PostReviewListProps {
  posts: Post[];
  onApprove: (postId: string, comment: string) => Promise<void>;
  onReject: (postId: string, comment: string) => Promise<void>;
}

const statusColors: Record<PostStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-gray-500'
};

const statusLabels: Record<PostStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired'
};

export function PostReviewList({ posts, onApprove, onReject }: PostReviewListProps) {
  const { authState } = useAuth();

  // Ensure posts is always an array
  const safePosts = Array.isArray(posts) ? posts : [];

  // Log when component renders with new props
  React.useEffect(() => {
    if (Array.isArray(posts)) {
      logger.debug(`PostReviewList rendered with ${posts.length} posts`, {
        postIds: posts.map(p => p.id || 'unknown').slice(0, 5),
        statuses: posts.map(p => p.status || 'unknown').slice(0, 5)
      });
    } else {
      logger.error('PostReviewList received non-array posts prop', { posts });
    }
  }, [posts]);

  return (
    <div className="space-y-4">
      {safePosts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No posts to display
        </div>
      ) : (
        <div className="space-y-4">
          {safePosts.filter(post => post && post.id).map(post => {
            // Log each post being rendered
            logger.debug(`Rendering post ${post.id}`, {
              title: post.title,
              status: post.status,
              createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt)
            });

            return (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{post.title}</CardTitle>
                    <Badge className={statusColors[post.status]}>
                      {statusLabels[post.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Posted by {post.author} {formatDistanceToNow(post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt))} ago
                      </p>
                      <p>{post.content}</p>
                    </div>

                    {post.status === 'pending' && (
                      <PostApprovalForm
                        post={post}
                        onApprove={onApprove}
                        onReject={onReject}
                      />
                    )}

                    {post.approvalComments && post.approvalComments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold">Review Comments:</h4>
                        {post.approvalComments.map((comment, index) => (
                          <div key={index} className="bg-muted p-2 rounded">
                            <p className="text-sm">{comment.text}</p>
                            <p className="text-xs text-muted-foreground">
                              By {comment.postedBy} on {formatDistanceToNow(comment.createdAt instanceof Date ? comment.createdAt : new Date(comment.createdAt))} ago
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}