// Common types that can be shared between React and React Native
export type Theme = 'light' | 'dark' | 'system';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

// Post related types
export interface Post {
  id: string;
  userId: string;
  content: string;
  media?: string[];
  likes: number;
  comments: number;
  createdAt: string;
}

// Comment related types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  referenceId: string;
  read: boolean;
  createdAt: string;
}