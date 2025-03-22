import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Post } from '../models/Post';
import { PostItem } from '../components/Posts/PostItem';
import { PostService } from '../services/PostService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock JSON data
vi.mock('../data/posts.json', () => ({
  default: {
    Posts: [
      {
        "Post 1": {
          ID: "1",
          Title: "Test Post with Tags",
          Content: "This is a test post with tags",
          Author: "Test Author",
          Category: "Internships",
          Tags: ["internship", "career", "opportunity"]
        }
      }
    ]
  }
}));

describe('Tags Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  
  it('should display tags from JSON in PostItem', () => {
    // Reset storage to initialize from our mocked JSON
    PostService.resetStorage();
    
    // Get posts which should now have data from our mock JSON
    const posts = PostService.getAllPosts();
    
    // Verify we have a post with tags
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].tags).toBeDefined();
    expect(posts[0].tags).toContain('internship');
    
    // Render the post item and check if tags are displayed
    render(<PostItem post={posts[0]} onLike={() => {}} />);
    
    // Verify tags are displayed
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('career')).toBeInTheDocument();
    expect(screen.getByText('opportunity')).toBeInTheDocument();
  });

  // Add test for lowercase tags
  it('should display lowercase tags from JSON in PostItem', () => {
    // Mock a post with lowercase tags
    const postWithLowercaseTags: Post = {
      id: '2',
      title: 'Post with Lowercase Tags',
      content: 'Content with lowercase tags',
      author: 'Test Author',
      createdAt: new Date(),
      likes: 0,
      category: 'Internships',
      tags: ['yale', 'summer', 'internship', 'usa']
    };
    
    // Render the post item
    render(<PostItem post={postWithLowercaseTags} onLike={() => {}} />);
    
    // Verify lowercase tags are displayed
    expect(screen.getByText('yale')).toBeInTheDocument();
    expect(screen.getByText('summer')).toBeInTheDocument();
    expect(screen.getByText('internship')).toBeInTheDocument();
    expect(screen.getByText('usa')).toBeInTheDocument();
  });
});
