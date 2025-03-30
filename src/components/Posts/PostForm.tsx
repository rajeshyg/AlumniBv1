import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { ImageUploader } from './ImageUploader';
import { Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PostStatus } from '../../models/Post';

type PostFormProps = {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialValues?: {
    title: string;
    content: string;
    category: string;
    tags: string;
  };
  submitLabel?: string;
};

export function PostForm({ 
  onSubmit, 
  onCancel, 
  initialValues = { title: '', content: '', category: 'General', tags: '' },
  submitLabel = 'Submit for Approval'
}: PostFormProps) {
  const { authState } = useAuth();
  const [title, setTitle] = useState(initialValues.title);
  const [content, setContent] = useState(initialValues.content);
  const [images, setImages] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // Parse initial tags string into array
  const [tags, setTags] = useState<string[]>(
    initialValues.tags ? initialValues.tags.split(',').map(tag => tag.trim()) : []
  );
  const [category, setCategory] = useState(initialValues.category);
  const [status, setStatus] = useState<PostStatus>('pending');

  // Predefined categories matching the updated categories
  const categories = ['Internships', 'Admissions', 'Scholarships', 'General'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    onSubmit({
      title: formData.get('title'),
      content: formData.get('content'),
      category: formData.get('category'),
      tags: formData.get('tags')
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-2">Create a New Post</h2>
      
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          data-testid="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
          required
        />
      </div>
      
      <div>
        <label htmlFor="content">Content</label>
        <RichTextEditor 
          value={content} 
          onChange={setContent} 
          placeholder="Write your post content here..."
        />
      </div>
      
      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          data-testid="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
          aria-label="Category"
          required
        >
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Images
        </label>
        <ImageUploader 
          images={images} 
          onChange={setImages} 
        />
      </div>
      
      <div>
        <label htmlFor="tags">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            <span key={tag} className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-full text-sm">
              <Tag className="w-3 h-3" />
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                &times;
              </button>
            </span>
          ))}
        </div>
        <input
          id="tags"
          name="tags"
          data-testid="tags-input"
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Add tags (press Enter to add)"
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium mb-1">
          Post Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PostStatus)}
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
          aria-label="Post Status"
        >
          <option value="pending">Request Approval</option>
          <option value="approved">Post Immediately</option>
        </select>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === 'pending' 
            ? 'Your post will be reviewed by a moderator before being published'
            : 'Your post will be published immediately'}
        </p>
      </div>
      
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border rounded-md hover:bg-accent text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
