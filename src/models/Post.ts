export interface Comment {
  text: string;
  postedBy: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  likes: number;
  image?: string; // Single image path
  images?: string[]; // For backward compatibility and multiple image support
  tags?: string[];
  comments?: Comment[];
  category?: string;
}
