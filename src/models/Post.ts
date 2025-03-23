export interface Comment {
  text: string;
  postedBy: string;
  postedById: string; // Add studentId
  createdAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId: string; // Add studentId
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  likedBy: string[]; // Array of studentIds who liked the post
  comments?: Comment[];
  image?: string;
  tags?: string[];
  category?: string;
}
