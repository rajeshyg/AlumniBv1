import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostForm } from './PostForm';

// Mock the RichTextEditor and ImageUploader components
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ id, value, onChange, placeholder }: any) => (
    <textarea 
      id={id}
      data-testid="rich-text-editor"
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));

vi.mock('./ImageUploader', () => ({
  ImageUploader: ({ images, onChange }: any) => (
    <div data-testid="image-uploader">
      <button 
        type="button" 
        onClick={() => onChange([...images, 'new-test-image.jpg'])}
      >
        Add Image
      </button>
    </div>
  )
}));

export default describe('PostForm', () => {
  const mockSubmit = vi.fn();
  
  beforeEach(() => {
    mockSubmit.mockClear();
  });
  
  it('renders form fields correctly', () => {
    render(<PostForm onSubmit={mockSubmit} />);
    
    // Check for title input
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    
    // Check for author input
    expect(screen.getByLabelText(/author/i)).toBeInTheDocument();
    
    // Check for category select
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    
    // Check for content editor
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    
    // Check for image uploader
    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    
    // Check for create button
    expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
  });
  
  it('submits form with entered data', () => {
    render(<PostForm onSubmit={mockSubmit} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Title' } });
    fireEvent.change(screen.getByLabelText(/author/i), { target: { value: 'Test Author' } });
    
    // Use getByTestId instead of getByLabelText for content
    fireEvent.change(screen.getByTestId('rich-text-editor'), { target: { value: 'Test content' } });
    
    // Select a category if needed
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Internships' } });
    
    // Submit the form
    fireEvent.click(screen.getByText(/create post/i));
    
    // Check if onSubmit was called with correct data
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      title: 'Test Title',
      author: 'Test Author',
      content: 'Test content',
      category: 'Internships',
      images: undefined,
      tags: undefined
    });
  });
  
  it('shows cancel button when onCancel prop is provided', () => {
    const mockCancel = vi.fn();
    render(<PostForm onSubmit={mockSubmit} onCancel={mockCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
