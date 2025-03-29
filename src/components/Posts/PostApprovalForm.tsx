import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Post, PostStatus } from '../../models/Post';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

interface PostApprovalFormProps {
  post: Post;
  onApprove: (postId: string, comment: string) => Promise<void>;
  onReject: (postId: string, comment: string) => Promise<void>;
}

export function PostApprovalForm({ post, onApprove, onReject }: PostApprovalFormProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authState } = useAuth();

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await onApprove(post.id, comment);
      setComment('');
      logger.info('Post approved', { postId: post.id });
    } catch (error) {
      logger.error('Failed to approve post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsSubmitting(true);
      await onReject(post.id, comment);
      setComment('');
      logger.info('Post rejected', { postId: post.id });
    } catch (error) {
      logger.error('Failed to reject post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Review Post</h3>
        <p className="text-sm text-muted-foreground">
          Please provide feedback for your decision
        </p>
      </div>
      
      <Textarea
        placeholder="Enter your feedback..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-[100px]"
      />
      
      <div className="flex gap-2">
        <Button
          variant="default"
          onClick={handleApprove}
          disabled={isSubmitting || !comment.trim()}
        >
          Approve
        </Button>
        <Button
          variant="destructive"
          onClick={handleReject}
          disabled={isSubmitting || !comment.trim()}
        >
          Reject
        </Button>
      </div>
    </div>
  );
} 