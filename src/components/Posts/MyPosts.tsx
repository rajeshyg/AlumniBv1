import React, { useState, useEffect } from 'react';
import { Post, PostStatus } from '../../models/Post';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface MyPostsProps {
  posts: Post[];
  onUpdatePost: (post: Post) => Promise<void>;
}

const statusLabels: Record<PostStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired'
};

const statusColors: Record<PostStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  expired: 'bg-gray-500'
};

export function MyPosts({ posts, onUpdatePost }: MyPostsProps) {
  const { authState } = useAuth();
  const [activeStatus, setActiveStatus] = useState<PostStatus>('pending');
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);

  // Update local posts when props change
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  const filteredPosts = localPosts.filter(post => post.status === activeStatus);

  const handleStatusChange = (status: string) => {
    setActiveStatus(status as PostStatus);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" onValueChange={handleStatusChange}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(statusLabels).map(([status, label]) => (
            <TabsTrigger key={status} value={status}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(statusLabels).map(([status, label]) => (
          <TabsContent key={status} value={status}>
            <div className="space-y-4">
              {filteredPosts.map(post => (
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
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Posted {formatDistanceToNow(post.createdAt)} ago
                      </p>
                      <p>{post.content}</p>
                      
                      {post.approvalComments && post.approvalComments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-semibold">Review Comments:</h4>
                          {post.approvalComments.map((comment, index) => (
                            <div key={index} className="bg-muted p-2 rounded">
                              <p className="text-sm">{comment.text}</p>
                              <p className="text-xs text-muted-foreground">
                                By {comment.postedBy} on {formatDistanceToNow(comment.createdAt)} ago
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredPosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No posts with {label.toLowerCase()} status
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 