export interface Comment {
  text: string;
  postedBy: string;
  postedById: string; // Add studentId
  createdAt: Date;
}

export type PostStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalComment {
  text: string;
  postedBy: string;
  postedById: string;
  createdAt: Date;
  status: PostStatus;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string; // Add studentId
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  likedBy: string[]; // Array of studentIds who liked the post
  comments?: Comment[];
  image?: string;
  tags?: string[];
  category?: string;
  status: PostStatus;
  approvalComments?: ApprovalComment[];
  lastApprovalDate?: Date;
  approvedBy?: string;
  approvedById?: string;
  rejectedBy?: string;
  rejectedById?: string;
  expiresAt?: Date;
}
