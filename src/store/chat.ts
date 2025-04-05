import { create } from 'zustand';
import { Chat, ChatMessage, ChatParticipant } from '../models/Chat';
import { ChatService } from '../services/ChatService';
import { logger } from '../utils/logger';
import { User } from '../models/User';

interface ChatStore {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Record<string, ChatMessage[]>;
  loading: boolean;
  error: string | null;
  typingUsers: Record<string, Set<string>>;
  unreadCounts: Record<string, number>;
  currentUser: User | null;
  
  // Actions
  initialize: () => Promise<void>;
  setCurrentChat: (chat: Chat | null) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  addTypingUser: (chatId: string, userId: string) => void;
  removeTypingUser: (chatId: string, userId: string) => void;
  updateUnreadCount: (chatId: string) => void;
  refreshChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: {},
  loading: false,
  error: null,
  typingUsers: {},
  unreadCounts: {},
  currentUser: null,

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null });
      ChatService.initialize();
      const { currentUser } = get();
      if (currentUser) {
        const chats = ChatService.getUserChats(currentUser.studentId);
        const messages: Record<string, ChatMessage[]> = {};
        const unreadCounts: Record<string, number> = {};

        // Load messages and unread counts for each chat
        for (const chat of chats) {
          messages[chat.id] = ChatService.getChatMessages(chat.id);
          unreadCounts[chat.id] = ChatService.getUnreadMessageCount(chat.id, currentUser.studentId);
        }

        set({
          chats,
          messages,
          unreadCounts,
          loading: false
        });
      }
    } catch (error) {
      logger.error('Failed to initialize chat store:', error);
      set({ error: 'Failed to initialize chat', loading: false });
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
    if (chat) {
      get().markAsRead(chat.id);
      get().loadMessages(chat.id);
    }
  },

  loadMessages: async (chatId) => {
    try {
      const messages = ChatService.getChatMessages(chatId);
      // Ensure messages are unique by ID
      const uniqueMessages = messages.reduce((acc: ChatMessage[], msg) => {
        if (!acc.some(m => m.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, []);

      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: uniqueMessages
        }
      }));
    } catch (error) {
      logger.error('Failed to load messages:', error);
    }
  },

  sendMessage: async (chatId, content) => {
    try {
      const { currentUser } = get();
      if (!currentUser) throw new Error('User not authenticated');

      // Send message and get response
      const message = ChatService.sendMessage(chatId, currentUser.studentId, content);
      
      // Update messages in store, ensuring uniqueness
      set(state => {
        const currentMessages = state.messages[chatId] || [];
        const messageExists = currentMessages.some(m => m.id === message.id);
        
        return {
          messages: {
            ...state.messages,
            [chatId]: messageExists ? currentMessages : [...currentMessages, message]
          }
        };
      });

      // Update chat list without reloading messages
      const updatedChats = ChatService.getUserChats(currentUser.studentId);
      set({ chats: updatedChats });
      
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  },

  markAsRead: async (chatId) => {
    try {
      const { currentUser } = get();
      if (!currentUser) return;

      ChatService.markMessagesAsRead(chatId, currentUser.studentId);
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: 0
        }
      }));
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  },

  addTypingUser: (chatId, userId) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: new Set([...(state.typingUsers[chatId] || []), userId])
      }
    }));
  },

  removeTypingUser: (chatId, userId) => {
    set(state => {
      const typingUsers = new Set(state.typingUsers[chatId] || []);
      typingUsers.delete(userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: typingUsers
        }
      };
    });
  },

  updateUnreadCount: (chatId) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const count = ChatService.getUnreadMessageCount(chatId, currentUser.studentId);
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: count
      }
    }));
  },

  refreshChats: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser) return;

      const chats = ChatService.getUserChats(currentUser.studentId);
      set({ chats });
    } catch (error) {
      logger.error('Failed to refresh chats:', error);
    }
  }
})); 