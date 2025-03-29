import React from 'react';
import { render, screen } from '@testing-library/react';
import { PostReviewList } from '../PostReviewList';
import { Post } from '../../../models/Post';
import { vi } from 'vitest';

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Pending Post',
    content: 'Content',
    author: 'Author',
    authorId: '123',
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    likedBy: [],
    image: '',
    tags: [],
    category: 'General',
    comments: [],
    status: 'pending',
    approvalComments: []
  },
  {
    id: '2',
    title: 'Approved Post',
    content: 'Content',
    author: 'Author',
    authorId: '123',
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    likedBy: [],
    image: '',
    tags: [],
    category: 'General',
    comments: [],
    status: 'approved',
    approvalComments: [{
      text: 'Looks good!',
      postedBy: 'Moderator',
      postedById: '456',
      createdAt: new Date(),
      status: 'approved'
    }]
  }
];

describe('PostReviewList', () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();

  it('should display posts with correct status badges', () => {
    render(<PostReviewList posts={mockPosts} onApprove={mockOnApprove} onReject={mockOnReject} />);
    
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('should show approval form only for pending posts', () => {
    render(<PostReviewList posts={mockPosts} onApprove={mockOnApprove} onReject={mockOnReject} />);
    
    expect(screen.getByText('Pending Post')).toBeInTheDocument();
    expect(screen.getByText('Approved Post')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('should display review comments for posts', () => {
    render(<PostReviewList posts={mockPosts} onApprove={mockOnApprove} onReject={mockOnReject} />);
    
    expect(screen.getByText('Review Comments:')).toBeInTheDocument();
    expect(screen.getByText('Looks good!')).toBeInTheDocument();
  });

  it('should show empty state when no posts are provided', () => {
    render(<PostReviewList posts={[]} onApprove={mockOnApprove} onReject={mockOnReject} />);
    
    expect(screen.getByText('No posts to display')).toBeInTheDocument();
  });
}); 