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
    logger.debug('Setting current user in chat store:', user ? {
      userId: user.studentId,
      name: user.name,
      email: user.email
    } : 'null');
    set({ currentUser: user });
  },

  initialize: async () => {
    try {
      set({ loading: true, error: null });
      logger.debug('Initializing chat store');
      
      ChatService.initialize();
      const { currentUser } = get();
      
      if (currentUser) {
        logger.debug('Current user found in chat store:', {
          userId: currentUser.studentId,
          name: currentUser.name,
          email: currentUser.email
        });
        
        const chats = ChatService.getUserChats(currentUser.studentId);
        logger.debug(`Found ${chats.length} chats for user:`, 
          chats.map(c => ({ id: c.id, name: c.name, participants: c.participants }))
        );
        
        const messages: Record<string, ChatMessage[]> = {};
        const unreadCounts: Record<string, number> = {};

        // Load messages and unread counts for each chat
        for (const chat of chats) {
          messages[chat.id] = ChatService.getChatMessages(chat.id);
          unreadCounts[chat.id] = ChatService.getUnreadMessageCount(chat.id, currentUser.studentId);
          logger.debug(`Chat ${chat.id}: loaded ${messages[chat.id].length} messages, ${unreadCounts[chat.id]} unread`);
        }

        // Subscribe to message updates
        ChatService.subscribeToMessageUpdates((chatId) => {
          logger.debug(`Message update callback triggered for chat ${chatId}`);
          
          const updatedMessages = ChatService.getChatMessages(chatId);
          logger.debug(`Loaded ${updatedMessages.length} messages for chat ${chatId}`);
          
          const chat = chats.find(c => c.id === chatId);
          
          if (chat) {
            // Update messages
            set(state => ({
              messages: {
                ...state.messages,
                [chatId]: updatedMessages
              }
            }));
            logger.debug(`Updated messages in store for chat ${chatId}`);

            // Update unread count
            const unreadCount = ChatService.getUnreadMessageCount(chatId, currentUser.studentId);
            set(state => ({
              unreadCounts: {
                ...state.unreadCounts,
                [chatId]: unreadCount
              }
            }));

            // Update chat list
            const updatedChats = ChatService.getUserChats(currentUser.studentId);
            set({ chats: updatedChats });
            logger.debug('Updated chat list after message update');
          }
        });

        set({
          chats,
          messages,
          unreadCounts,
          loading: false
        });
        logger.debug('Chat store initialized successfully');
      } else {
        logger.debug('No current user found, skipping chat store initialization');
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
      // Update messages in store, ensuring no duplicates
      set(state => {
        const currentMessages = state.messages[chatId] || [];
        const newMessages = messages.filter(msg => 
          !currentMessages.some(existing => existing.id === msg.id)
        );
        
        if (newMessages.length === 0) {
          return state;
        }

        return {
          messages: {
            ...state.messages,
            [chatId]: [...currentMessages, ...newMessages].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
          }
        };
      });
    } catch (error) {
      logger.error('Failed to load messages:', error);
    }
  },

  sendMessage: async (chatId, content) => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        logger.error('Cannot send message: User not authenticated');
        throw new Error('User not authenticated');
      }

      logger.debug('Sending message from chat store:', {
        chatId,
        content,
        userId: currentUser.studentId
      });
      
      // Send message
      const message = ChatService.sendMessage(chatId, currentUser.studentId, content);
      logger.debug('Message sent successfully, got response:', JSON.stringify(message));
      
      // Update messages in store
      set(state => {
        const currentMessages = state.messages[chatId] || [];
        if (currentMessages.some(m => m.id === message.id)) {
          logger.debug('Message already exists in store, skipping update');
          return state;
        }
        
        logger.debug('Adding message to store');
        return {
          messages: {
            ...state.messages,
            [chatId]: [...currentMessages, message].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
          }
        };
      });

      // Update chat list and trigger refresh
      const updatedChats = ChatService.getUserChats(currentUser.studentId);
      set({ chats: updatedChats });
      logger.debug('Updated chat list after sending message');
      
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
    const { currentUser } = get();
    if (!currentUser || userId === currentUser.studentId) return;

    ChatService.addTypingUser(chatId, userId);
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: new Set([...(state.typingUsers[chatId] || []), userId])
      }
    }));
  },

  removeTypingUser: (chatId, userId) => {
    const { currentUser } = get();
    if (!currentUser || userId === currentUser.studentId) return;

    ChatService.removeTypingUser(chatId, userId);
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