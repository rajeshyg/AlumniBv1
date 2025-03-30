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
      data-testid="rich-text-editor"
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

  it('renders form fields correctly', () => {
    render(
      <PostForm 
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add tags/i)).toBeInTheDocument();
  });

  it('submits form with entered data', async () => {
    render(
      <PostForm 
        onSubmit={mockSubmit}
        onCancel={mockCancel}
      />
    );

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Title' }
    });

    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Test Content' }
    });

    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: 'Internships' }
    });

    // Update tags input handling
    const tagInput = screen.getByPlaceholderText(/add tags/i);
    fireEvent.change(tagInput, { target: { value: 'test-tag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Title',
      content: 'Test Content',
      category: 'Internships',
      tags: ['test-tag']
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
