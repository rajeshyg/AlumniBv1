import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { ImageUploader } from './ImageUploader';
import { Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PostStatus } from '../../models/Post';

interface PostFormProps {
  onSubmit: (post: {
    title: string;
    content: string;
    author: string;
    authorId: string;
    images?: string[];
    tags?: string[];
    category?: string;
    status: PostStatus;
  }) => void;
  onCancel?: () => void;
  initialStatus?: PostStatus;
}

export const PostForm: React.FC<PostFormProps> = ({ onSubmit, onCancel, initialStatus = 'pending' }) => {
  const { authState } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<PostStatus>(initialStatus);

  // Predefined categories matching the updated categories
  const categories = ['Internships', 'Admissions', 'Scholarships', 'General'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authState.currentUser) {
      console.error('User not authenticated');
      return;
    }
    
    if (content.trim() && title.trim()) {
      onSubmit({
        title,
        content,
        author: authState.currentUser.name,
        authorId: authState.currentUser.studentId,
        images: images.length > 0 ? images : undefined,
        tags: tags.length > 0 ? tags : undefined,
        category: category || 'General',
        status
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setImages([]);
      setTags([]);
      setCategory('');
      setStatus(initialStatus);
    }
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
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
          required
        />
      </div>
      
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1">
          Content
        </label>
        <RichTextEditor 
          value={content} 
          onChange={setContent} 
          placeholder="Write your post content here..."
        />
      </div>
      
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
          aria-label="Category"
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
        <label className="block text-sm font-medium mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
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
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border/40 rounded-md"
          >
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          {status === 'pending' ? 'Submit for Approval' : 'Create Post'}
        </button>
      </div>
    </form>
  );
};
