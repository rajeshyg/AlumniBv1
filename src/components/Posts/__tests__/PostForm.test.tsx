import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostForm } from '../PostForm';
import { useAuth } from '../../../context/AuthContext';

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the nested components
vi.mock('../RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder?: string;
  }) => (
    <textarea 
      id="content"
      name="content"
      data-testid="content-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}));

vi.mock('../ImageUploader', () => ({
  ImageUploader: ({ images, onChange }: { 
    images: string[]; 
    onChange: (images: string[]) => void;
  }) => (
    <div data-testid="image-uploader">
      <button 
        type="button"
        onClick={() => onChange([...images, 'test-image.jpg'])}
      >
        Add Image ({images.length})
      </button>
    </div>
  )
}));

describe('PostForm', () => {
  const mockUser = {
    studentId: "10008",
    name: "Test User",
    email: "test@example.com"
  };

  const mockSubmit = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({
      authState: {
        currentUser: mockUser,
        isAuthenticated: true,
        loading: false
      }
    });
  });

  it('renders form fields', () => {
    render(<PostForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    // Use testids instead of label text to find elements
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
    expect(screen.getByTestId('content-input')).toBeInTheDocument();
    expect(screen.getByTestId('category-select')).toBeInTheDocument();
    expect(screen.getByTestId('tags-input')).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(<PostForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    // Attempt to submit the form (relies on browser validation)
    // Since we can't test browser validation easily, we'll just check that the submit handler was not called
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    // Check the submit handler was not called because form is invalid
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits form with entered data', () => {
    render(<PostForm onSubmit={mockSubmit} onCancel={mockCancel} />);

    // Fill in form fields using testids
    fireEvent.change(screen.getByTestId('title-input'), {
      target: { value: 'Test Title' }
    });
    
    fireEvent.change(screen.getByTestId('content-input'), {
      target: { value: 'Test Content' }
    });
    
    fireEvent.change(screen.getByTestId('category-select'), {
      target: { value: 'Internships' }
    });
    
    fireEvent.change(screen.getByTestId('tags-input'), {
      target: { value: 'test-tag' }
    });
    // Add tag
    fireEvent.keyDown(screen.getByTestId('tags-input'), { key: 'Enter' });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit for approval/i }));

    // Check that data was passed correctly
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Title',
      content: 'Test Content',
      category: 'Internships',
      tags: expect.any(String)
    }));
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <PostForm 
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockCancel).toHaveBeenCalled();
  });
});
