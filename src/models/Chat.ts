import { User } from './User';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  readBy: string[];
  sender?: User; // Optional because we might not always have the full user object
}

export interface Chat {
  id: string;
  postId?: string;  // Optional since direct chats don't have a post
  name: string;
  participants: string[]; // Array of studentIds
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage;
  lastMessageId?: string;
  lastMessageTime?: string;
}

export interface ChatParticipant {
  chatId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
}

export interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Record<string, ChatMessage[]>;
  loading: boolean;
  error: string | null;
} 