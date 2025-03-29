import React from 'react';
import { Post } from '../../models/Post';
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

export function PostReviewList({ posts, onApprove, onReject }: PostReviewListProps) {
  const { authState } = useAuth();

  const pendingPosts = posts.filter(post => post.status === 'pending');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Posts Pending Review</h2>
      
      {pendingPosts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No posts pending review
        </div>
      ) : (
        <div className="space-y-4">
          {pendingPosts.map(post => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{post.title}</CardTitle>
                  <Badge className="bg-yellow-500">
                    Pending Approval
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Posted by {post.author} {formatDistanceToNow(post.createdAt)} ago
                    </p>
                    <p>{post.content}</p>
                  </div>

                  <PostApprovalForm
                    post={post}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 