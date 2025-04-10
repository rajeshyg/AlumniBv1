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
  sendMessage: (chatId: string, content: string, metadata?: any) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;

  // Message deletion
  deleteMessage: (messageId: string) => Promise<boolean>;
  removeMessage: (chatId: string, messageId: string) => void;

  // Methods for real-time updates
  addOrUpdateMessage: (message: ChatMessage) => void;
  updateChatWithLastMessage: (chatId: string, lastMessage: ChatMessage) => void;
  incrementUnreadCount: (chatId: string) => void;

  // Add a property to track processed messages by content
  processedMessageContents: Set<string>;
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

        // CRITICAL: Set up a direct message handler that updates the store
        // This ensures the UI updates immediately when new messages arrive
        ChatService.subscribeToMessageUpdates((chatId, message) => {
          if (message) {
            logger.debug('Direct store update from ChatService subscription:', message.id);
            get().addOrUpdateMessage(message);
          } else {
            // Fallback to loading messages if we just got a chat ID
            const state = get();
            if (state.currentUser) {
              logger.debug('Fallback chat update from ChatService subscription:', chatId);
              // Ensure the chat list is updated
              get().loadChats();
            }
          }
        });
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

  // Add or update a message in the store with enhanced duplicate protection
  addOrUpdateMessage: (message: ChatMessage) => {
    logger.debug('Processing received message:', {
      messageId: message.id,
      chatId: message.chatId
    });

    set(state => {
      // 1. Check if this exact message ID already exists to prevent duplicates
      const existingMessages = state.messages[message.chatId] || [];
      const messageExists = existingMessages.some(m => m.id === message.id);

      if (messageExists) {
        logger.debug('Ignoring duplicate message by ID:', message.id);
        return state; // Return unchanged state
      }

      // 2. Check for very similar content that might be a duplicate
      const contentKey = `${message.chatId}:${message.senderId}:${message.content}`;
      if (get().processedMessageContents.has(contentKey)) {
        logger.debug('Ignoring likely duplicate message by content:', {
          content: message.content,
          chatId: message.chatId
        });
        return state;
      }

      // Add to processed message contents
      get().processedMessageContents.add(contentKey);

      // Clear old entries after 10 minutes to prevent memory leaks
      setTimeout(() => {
        get().processedMessageContents.delete(contentKey);
      }, 10 * 60 * 1000);

      logger.debug('Adding new message to store:', {
        messageId: message.id,
        chatId: message.chatId,
        content: message.content?.substring(0, 20) + (message.content?.length > 20 ? '...' : '')
      });

      // Add the message to the messages array for this chat
      const updatedMessages = {
        ...state.messages,
        [message.chatId]: [...existingMessages, message]
      };

      // CRITICAL: Find the chat in the state and update it directly
      // This ensures the UI updates properly without requiring a tap
      let updatedChats = [...state.chats];
      const chatIndex = updatedChats.findIndex(c => c.id === message.chatId);

      if (chatIndex >= 0) {
        // Copy the chat to avoid reference issues
        const updatedChat = {...updatedChats[chatIndex]};

        // Update last message properties
        updatedChat.lastMessageId = message.id;
        updatedChat.lastMessageTime = message.timestamp;
        // CRITICAL FIX: Ensure the lastMessage object is properly set
        // This ensures the chat list shows the correct last message preview
        updatedChat.lastMessage = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          timestamp: message.timestamp,
          chatId: message.chatId,
          readBy: message.readBy || [],
          source: message.source,
          sequence: message.sequence
        };

        // Remove the chat from its current position
        updatedChats.splice(chatIndex, 1);
        // Add it to the top of the list
        updatedChats = [updatedChat, ...updatedChats];

        logger.debug('Moved chat to top of list for new message:', {
          chatId: message.chatId,
          messageId: message.id
        });
      } else {
        // If the chat doesn't exist in our list, we might need to fetch it
        // This can happen if a new chat was created while the app is running
        logger.debug('Chat not found in state, might need to reload chats');

        // We'll trigger a chat reload in the next tick to avoid state conflicts
        setTimeout(() => {
          get().loadChats();
        }, 100);
      }

      // If this is a new message and it's not from the current user, increment unread count
      const currentUser = state.currentUser;
      let unreadCounts = {...state.unreadCounts};

      if (currentUser && message.senderId !== currentUser.studentId) {
        unreadCounts = {
          ...unreadCounts,
          [message.chatId]: (unreadCounts[message.chatId] || 0) + 1
        };
        logger.debug('Incremented unread count for chat:', {
          chatId: message.chatId,
          newCount: unreadCounts[message.chatId]
        });
      }

      // Force a UI refresh by returning a completely new state object
      return {
        ...state,
        messages: updatedMessages,
        chats: updatedChats,
        unreadCounts
      };
    });
  },

  // Update a chat with the latest message info (to update the chat list)
  updateChatWithLastMessage: (chatId: string, lastMessage: ChatMessage) => {
    logger.debug('Updating chat with last message:', {
      chatId,
      messageId: lastMessage.id
    });

    set(state => {
      // Create a properly typed updatedChats array
      const updatedChats = state.chats.map(chat => {
        if (chat.id === chatId) {
          // Create a new timestamp for the lastMessageTime that's slightly later
          // than any existing timestamp to ensure it sorts at the top
          const lastMessageTime = new Date(
            Math.max(
              new Date(lastMessage.timestamp).getTime(),
              chat.lastMessageTime ? new Date(chat.lastMessageTime).getTime() : 0
            ) + 1
          ).toISOString();

          // Create a simplified lastMessage object that matches the Chat type
          return {
            ...chat,
            lastMessageId: lastMessage.id,
            lastMessageTime,
            lastMessage: {
              id: lastMessage.id,
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              timestamp: lastMessage.timestamp,
              chatId: lastMessage.chatId,
              readBy: lastMessage.readBy,
              source: lastMessage.source,
              sequence: lastMessage.sequence
            }
          };
        }
        return chat;
      });

      return { chats: updatedChats };
    });
  },

  // Increment the unread count for a chat
  incrementUnreadCount: (chatId: string) => {
    logger.debug('Incrementing unread count for chat:', { chatId });

    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1
      }
    }));
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
  sendMessage: async (chatId: string, content: string, metadata?: any) => {
    try {
      logger.debug('Sending message:', {
        chatId,
        content,
        hasMetadata: !!metadata,
        metadataType: metadata ? Object.keys(metadata) : null
      });

      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot send message: No current user');
        return;
      }

      // Create the message in Supabase
      const message = await ChatService.sendMessage(chatId, currentUser.studentId, content, metadata);

      if (!message) {
        logger.error('No message returned from sendMessage');
        return;
      }

      logger.debug('Message sent successfully:', {
        messageId: message.id,
        hasMetadata: !!message.metadata
      });

      // Add the message to the store directly
      get().addOrUpdateMessage(message);
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

        // Reset the unread count in the store
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: 0
          }
        }));

        logger.debug('Messages marked as read, reset unread count:', { chatId });
      } catch (markError) {
        logger.error('Error marking messages as read:', markError);
      }
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  },

  // Delete a message
  deleteMessage: async (messageId: string) => {
    try {
      logger.debug('Deleting message:', { messageId });

      const currentUser = get().currentUser;
      if (!currentUser) {
        logger.error('Cannot delete message: No current user');
        return false;
      }

      // Call the service to delete the message
      const success = await ChatService.deleteMessage(messageId, currentUser.studentId);

      if (success) {
        logger.debug('Message deleted successfully:', { messageId });

        // Find which chat this message belongs to
        let chatId = null;
        const allMessages = get().messages;

        // Search through all chats to find the message
        for (const [cId, messages] of Object.entries(allMessages)) {
          if (messages.some(m => m.id === messageId)) {
            chatId = cId;
            break;
          }
        }

        if (chatId) {
          // Remove the message from the store
          get().removeMessage(chatId, messageId);
        }

        return true;
      } else {
        logger.error('Failed to delete message:', { messageId });
        return false;
      }
    } catch (error) {
      logger.error('Error deleting message:', error);
      return false;
    }
  },

  // Remove a message from the store (used after deletion or for local cleanup)
  removeMessage: (chatId: string, messageId: string) => {
    logger.debug('Removing message from store:', { chatId, messageId });

    set(state => {
      // Get the current messages for this chat
      const chatMessages = state.messages[chatId] || [];

      // Filter out the deleted message
      const updatedMessages = chatMessages.filter(m => m.id !== messageId);

      // Update the messages state
      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages
        }
      };
    });
  },

  // Add a property to track processed messages by content
  processedMessageContents: new Set(),
}));