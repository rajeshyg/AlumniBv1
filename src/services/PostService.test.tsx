import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostService } from './PostService';

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

describe('Post tags', () => {
  // Mock the JSON data with tags
  const mockJsonData = {
    Posts: [
      {
        "Post 1": {
          ID: "1",
          Title: "Post with Tags",
          Content: "This is a test post with tags",
          Author: "Test Author",
          createdAt: "2023-01-01T12:00:00Z",
          Likes: 5,
          Tags: ["test", "json", "tags"],
          Category: "Internships"
        }
      }
    ]
  };
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });
  
  it('should extract tags from JSON data', () => {
    // Use private method directly for testing
    // @ts-ignore - accessing private method for testing
    const transformedPosts = PostService.transformJsonToPosts(mockJsonData);
    
    expect(transformedPosts.length).toBe(1);
    expect(transformedPosts[0].tags).toBeDefined();
    expect(transformedPosts[0].tags).toEqual(["test", "json", "tags"]);
  });

  it('should extract tags from JSON data with lowercase "tags" field', () => {
    const mockJsonDataLowercase = {
      Posts: [
        {
          "Post 1": {
            ID: "1",
            Title: "Post with Lowercase Tags",
            Content: "This is a test post with lowercase tags",
            Author: "Test Author",
            createdAt: "2023-01-01T12:00:00Z",
            Likes: 5,
            tags: ["yale", "summer", "internship"],
            category: "Internships"
          }
        }
      ]
    };
    
    // @ts-ignore - accessing private method for testing
    const transformedPosts = PostService.transformJsonToPosts(mockJsonDataLowercase);
    
    expect(transformedPosts.length).toBe(1);
    expect(transformedPosts[0].tags).toBeDefined();
    expect(transformedPosts[0].tags).toEqual(["yale", "summer", "internship"]);
  });
});