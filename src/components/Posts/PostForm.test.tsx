import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostForm } from './PostForm';
import { useAuth } from '../../context/AuthContext';

// Mock the auth context
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the nested components
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder, id }) => (
    <textarea 
      data-testid="rich-text-editor"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));

vi.mock('./ImageUploader', () => ({
  ImageUploader: ({ images, onChange }) => (
    <div data-testid="image-uploader">
      <button type="button">Add Image</button>
    </div>
  )
}));

describe('PostForm', () => {
  const mockSubmit = vi.fn();
  const mockCancel = vi.fn();
  
  // Mock current user
  const mockUser = {
    studentId: "test-id",
    name: "Test User",
    email: "test@example.com"
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup mock auth context
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: mockUser,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    });
  });

  it('renders form fields correctly', () => {
    render(<PostForm onSubmit={mockSubmit} />);
    
    // Check for title input
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    
    // Check for content input
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    
    // Check for category select
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    
    // Check for image uploader
    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    
    // Check for tags input
    expect(screen.getByPlaceholderText(/add tags/i)).toBeInTheDocument();
  });

  it('submits form with entered data', () => {
    render(<PostForm onSubmit={mockSubmit} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Title' } });
    
    // Use getByTestId for the mocked rich text editor
    const contentEditor = screen.getByTestId('rich-text-editor');
    fireEvent.change(contentEditor, { target: { value: 'Test Content' } });
    
    // Submit the form
    fireEvent.submit(screen.getByText(/create post/i));
    
    // Check that onSubmit was called with the correct data
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Title',
      content: 'Test Content',
      author: mockUser.name,
      authorId: mockUser.studentId
    }));
  });

  it('shows cancel button when onCancel prop is provided', () => {
    render(<PostForm onSubmit={mockSubmit} onCancel={mockCancel} />);
    
    const cancelButton = screen.getByText(/cancel/i);
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
