import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostItem } from './PostItem';
import { Post } from '../../models/Post';

// Export the test suite
export default describe('PostItem', () => {
  const mockPost: Post = {
    id: '1',
    title: 'Test Post Title',
    content: 'Test post content',
    author: 'Test Author',
    createdAt: new Date('2023-05-15'),
    likes: 5,
    category: 'Internships',
    tags: ['internship', 'opportunity']
  };
  
  const mockOnLike = vi.fn();
  
  beforeEach(() => {
    mockOnLike.mockClear();
  });
  
  it('renders post content correctly', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Check for title
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    
    // Check for content
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    
    // Check for author - now prefixed with "By"
    expect(screen.getByText(/By Test Author/)).toBeInTheDocument();
    
    // Check for likes count
    expect(screen.getByText('5')).toBeInTheDocument();
    
    // Verify date formatting - assuming local date format
    const formattedDate = new Date('2023-05-15').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });
  
  it('displays category and tags correctly', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Check for category
    expect(screen.getByText('Internships')).toBeInTheDocument();
    
    // Check for tags
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('opportunity')).toBeInTheDocument();
  });
  
  it('calls onLike when the like button is clicked', () => {
    render(<PostItem post={mockPost} onLike={mockOnLike} />);
    
    // Find like button by role and click it
    const likeButton = screen.getByRole('button', { 
      name: /5/i  // Now we use the number as the accessible name
    });
    fireEvent.click(likeButton);
    
    expect(mockOnLike).toHaveBeenCalledTimes(1);
    expect(mockOnLike).toHaveBeenCalledWith('1');
  });

  it('displays multiple tags correctly', () => {
    const postWithMultipleTags = {
      ...mockPost,
      tags: ['javascript', 'react', 'testing']
    };
    
    render(<PostItem post={postWithMultipleTags} onLike={mockOnLike} />);
    
    // Check for all tags
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
  });
  
  it('handles missing tags gracefully', () => {
    const postWithoutTags = {
      ...mockPost,
      tags: undefined
    };
    
    // This should render without errors
    render(<PostItem post={postWithoutTags} onLike={mockOnLike} />);
    
    // Should still render the post content
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });
});
