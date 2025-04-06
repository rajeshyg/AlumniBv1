import { create } from 'zustand';
import { Chat, ChatMessage } from '../models/Chat';
import { ChatService } from '../services/ChatService';
import { logger } from '../utils/logger';
import { User } from '../models/User';

export interface ChatStore {
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;
  unreadCounts: Record<string, number>;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  messages: {},
  unreadCounts: {},
  currentUser: null,
  loading: false,
  error: null,

  // Set current user for the chat store
  setCurrentUser: (user) => {
    logger.debug('Setting current user in chat store:', user ? {
      userId: user.studentId,
      name: user.name,
      email: user.email
    } : 'null');
    
    set({ currentUser: user });
    
    // Initialize Chat Service if user is set
    if (user) {
      if (!ChatService.isInitialized()) {
        ChatService.initialize(user.studentId);
      }
    }
  },

  // Load all chats for the current user
  loadChats: async () => {
    try {
      set({ loading: true, error: null });
      logger.debug('Loading chats');
      
      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot load chats: No current user');
        set({ loading: false, error: 'No current user' });
        return;
      }
      
      try {
        // Initialize chat service if needed
        if (!ChatService.isInitialized()) {
          ChatService.initialize(currentUser.studentId);
        }
        
        const chats = await ChatService.getUserChats(currentUser.studentId);
        logger.debug('Chats loaded:', { count: chats.length });
        
        set({ chats, loading: false });
      } catch (chatError) {
        logger.error('Error loading chats:', chatError);
        set({ loading: false, error: 'Error loading chats' });
      }
    } catch (error) {
      logger.error('Failed to load chats:', error);
      set({ loading: false, error: 'Failed to load chats' });
    }
  },

  // Load messages for a specific chat
  loadMessages: async (chatId: string) => {
    try {
      set({ loading: true, error: null });
      logger.debug('Loading messages for chat:', { chatId });
      
      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot load messages: No current user');
        set({ loading: false, error: 'No current user' });
        return;
      }
      
      try {
        const messages = await ChatService.getChatMessages(chatId);
        logger.debug('Messages loaded:', { chatId, count: messages.length });
        
        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: messages
          },
          loading: false
        }));
      } catch (chatError) {
        logger.error('Error loading messages:', chatError);
        set({ loading: false, error: 'Error loading messages' });
      }
    } catch (error) {
      logger.error('Failed to load messages:', error);
      set({ loading: false, error: 'Failed to load messages' });
    }
  },

  // Send a message
  sendMessage: async (chatId: string, content: string) => {
    try {
      logger.debug('Sending message:', { chatId, content });
      
      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot send message: No current user');
        return;
      }
      
      // Create the message in Supabase
      const message = await ChatService.sendMessage(chatId, currentUser.studentId, content);
      
      if (!message) {
        logger.error('No message returned from sendMessage');
        return;
      }
      
      logger.debug('Message sent successfully:', { messageId: message.id });
      
      // Add the message to the store
      set(state => {
        const existingMessages = state.messages[chatId] || [];
        
        // Check if the message already exists
        if (existingMessages.some(m => m.id === message.id)) {
          logger.debug('Message already exists in store:', { messageId: message.id });
          return state;
        }
        
        logger.debug('Adding message to store:', { messageId: message.id });
        
        return {
          messages: {
            ...state.messages,
            [chatId]: [...existingMessages, message]
          }
        };
      });
      
      // Update the chat list to show the latest message
      await get().loadChats();
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  },

  // Mark messages as read
  markAsRead: async (chatId: string) => {
    try {
      logger.debug('Marking messages as read:', { chatId });
      
      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot mark messages as read: No current user');
        return;
      }
      
      try {
        // Mark messages as read in Supabase
        await ChatService.markMessagesAsRead(chatId, currentUser.studentId);
        
        // Get the updated unread count
        const unreadCount = await ChatService.getUnreadMessageCount(chatId, currentUser.studentId);
        
        // Update the unread count in the store
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: Number(unreadCount)
          }
        }));
        
        logger.debug('Messages marked as read:', { chatId, unreadCount });
      } catch (markError) {
        logger.error('Error marking messages as read:', markError);
      }
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  }
})); 