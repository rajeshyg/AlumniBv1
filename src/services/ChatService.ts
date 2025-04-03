import { Chat, ChatMessage, ChatParticipant } from '../models/Chat';
import { logger } from '../utils/logger';
import { UserService } from './UserService';

interface SerializedChat {
  id: string;
  postId?: string;
  name: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageId?: string;
  lastMessageTime?: string;
}

interface SerializedMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  readBy: string[];
}

export class ChatService {
  private static chats: Chat[] = [];
  private static messages: Record<string, ChatMessage[]> = {};
  private static participants: ChatParticipant[] = [];

  // Initialize chats from localStorage
  static initialize(): void {
    try {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        const serializedChats: SerializedChat[] = JSON.parse(savedChats);
        this.chats = serializedChats.map(chat => ({
          ...chat,
          lastMessage: undefined // Will be populated when needed
        }));
      }

      const savedMessages = localStorage.getItem('chat_messages');
      if (savedMessages) {
        const serializedMessages: Record<string, SerializedMessage[]> = JSON.parse(savedMessages);
        this.messages = serializedMessages;
      }

      const savedParticipants = localStorage.getItem('chat_participants');
      if (savedParticipants) {
        this.participants = JSON.parse(savedParticipants);
      }

      logger.info('Chat service initialized', {
        chatCount: this.chats.length,
        messageCount: Object.keys(this.messages).length,
        participantCount: this.participants.length
      });
    } catch (error) {
      logger.error('Failed to initialize chats:', error);
      // Reset to empty state if initialization fails
      this.chats = [];
      this.messages = {};
      this.participants = [];
    }
  }

  // Create a new chat (for both group and 1-1)
  static createChat(name: string, participants: string[], postId?: string): Chat {
    try {
      const chat: Chat = {
        id: `chat-${Date.now()}`,
        postId: postId || '',
        name,
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.chats.push(chat);
      this.messages[chat.id] = [];

      // Add participants
      participants.forEach(userId => {
        this.participants.push({
          chatId: chat.id,
          userId,
          joinedAt: new Date().toISOString()
        });
      });

      this.saveChats();
      this.saveParticipants();
      logger.info('Chat created', { 
        chatId: chat.id, 
        postId: chat.postId, 
        participantCount: participants.length,
        isGroup: participants.length > 2
      });
      return chat;
    } catch (error) {
      logger.error('Failed to create chat:', error);
      throw error;
    }
  }

  // Create a 1-1 chat between two users
  static async createDirectChat(userId1: string, userId2: string): Promise<Chat> {
    try {
      // Check if a direct chat already exists between these users
      const existingChat = this.chats.find(chat => {
        if (chat.participants.length !== 2) return false;
        return chat.participants.includes(userId1) && chat.participants.includes(userId2);
      });

      if (existingChat) {
        return existingChat;
      }

      // Get the other user's name for the chat title
      const otherUser = await UserService.findUserById(userId2);
      if (!otherUser) {
        throw new Error('User not found');
      }

      // Create new chat with the other user's name
      const chat: Chat = {
        id: `chat-${Date.now()}`,
        name: otherUser.name || 'Unknown User',
        participants: [userId1, userId2],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: undefined
      };

      this.chats.push(chat);
      this.saveChats();
      logger.info('Created direct chat', { 
        chatId: chat.id,
        userId1,
        userId2,
        chatName: chat.name
      });

      return chat;
    } catch (error) {
      logger.error('Failed to create direct chat:', error);
      throw error;
    }
  }

  // Get all chats for a user with their last messages
  static getUserChats(userId: string): Chat[] {
    try {
      return this.chats
        .filter(chat => chat.participants.includes(userId))
        .map(chat => {
          const chatMessages = this.messages[chat.id] || [];
          if (chat.lastMessageId) {
            chat.lastMessage = chatMessages.find(m => m.id === chat.lastMessageId);
          }
          return chat;
        });
    } catch (error) {
      logger.error('Failed to get user chats:', error);
      return [];
    }
  }

  // Get direct chats for a user
  static getDirectChats(userId: string): Chat[] {
    try {
      return this.chats.filter(chat => 
        chat.participants.includes(userId) &&
        chat.participants.length === 2
      );
    } catch (error) {
      logger.error('Failed to get direct chats:', error);
      return [];
    }
  }

  // Get group chats for a user
  static getGroupChats(userId: string): Chat[] {
    try {
      return this.chats.filter(chat => 
        chat.participants.includes(userId) &&
        chat.participants.length > 2
      );
    } catch (error) {
      logger.error('Failed to get group chats:', error);
      return [];
    }
  }

  // Get a specific chat by ID with its last message
  static getChat(chatId: string): Chat | null {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) return null;

      // If the chat has a lastMessageId, find the actual message
      if (chat.lastMessageId) {
        const messages = this.messages[chat.id] || [];
        chat.lastMessage = messages.find(m => m.id === chat.lastMessageId) || undefined;
      }

      return chat;
    } catch (error) {
      logger.error('Failed to get chat:', error);
      return null;
    }
  }

  // Get messages for a specific chat
  static getChatMessages(chatId: string): ChatMessage[] {
    try {
      return this.messages[chatId] || [];
    } catch (error) {
      logger.error('Failed to get chat messages:', error);
      return [];
    }
  }

  // Send a message in a chat
  static sendMessage(chatId: string, senderId: string, content: string): ChatMessage {
    try {
      logger.debug('Sending message:', { chatId, senderId, contentLength: content.length });
      
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        chatId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        readBy: [senderId]
      };

      // Initialize messages array for this chat if it doesn't exist
      if (!this.messages[chatId]) {
        this.messages[chatId] = [];
      }

      // Add message to the chat's messages
      this.messages[chatId].push(message);

      // Update chat's lastMessage and timestamps
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessageId = message.id;
        chat.lastMessageTime = message.timestamp;
        chat.updatedAt = new Date().toISOString();
        chat.lastMessage = message; // Set for immediate use

        // Save all changes to localStorage
        this.saveMessages();
        this.saveChats();
        
        logger.debug('Message saved and chat updated:', { 
          chatId, 
          messageId: message.id,
          lastMessageTime: chat.lastMessageTime
        });
      } else {
        logger.error('Chat not found when sending message:', { chatId });
        throw new Error('Chat not found');
      }

      logger.info('Message sent successfully', { 
        chatId, 
        messageId: message.id, 
        senderId 
      });
      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  // Add a participant to a chat
  static addParticipant(chatId: string, userId: string): void {
    try {
      const chat = this.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      if (!chat.participants.includes(userId)) {
        chat.participants.push(userId);
        this.participants.push({
          chatId,
          userId,
          joinedAt: new Date().toISOString()
        });
        this.saveChats();
        this.saveParticipants();
        logger.info('Participant added to chat', { chatId, userId });
      }
    } catch (error) {
      logger.error('Failed to add participant:', error);
      throw error;
    }
  }

  // Mark messages as read
  static markMessagesAsRead(chatId: string, userId: string): void {
    try {
      const participant = this.participants.find(
        p => p.chatId === chatId && p.userId === userId
      );

      if (participant) {
        participant.lastReadAt = new Date().toISOString();
        this.saveParticipants();
        logger.info('Messages marked as read', { chatId, userId });
      }
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  }

  // Get unread message count for a user in a chat
  static getUnreadMessageCount(chatId: string, userId: string): number {
    try {
      const participant = this.participants.find(
        p => p.chatId === chatId && p.userId === userId
      );

      if (!participant) return 0;

      const lastReadTime = participant.lastReadAt || participant.joinedAt;
      return this.messages[chatId]?.filter(
        msg => msg.timestamp > lastReadTime && msg.senderId !== userId
      ).length || 0;
    } catch (error) {
      logger.error('Failed to get unread message count:', error);
      return 0;
    }
  }

  // Remove a participant from a chat
  static removeParticipant(chatId: string, userId: string): void {
    try {
      const chat = this.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.participants = chat.participants.filter(id => id !== userId);
      this.participants = this.participants.filter(p => 
        !(p.chatId === chatId && p.userId === userId)
      );
      chat.updatedAt = new Date().toISOString();
      this.saveChats();
      this.saveParticipants();
      logger.info('Removed participant from chat', { chatId, userId });
    } catch (error) {
      logger.error('Failed to remove participant:', error);
      throw error;
    }
  }

  // Save chats to localStorage
  private static saveChats(): void {
    try {
      // Create a serializable version of chats
      const serializedChats: SerializedChat[] = this.chats.map(chat => ({
        id: chat.id,
        postId: chat.postId,
        name: chat.name,
        participants: chat.participants,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageId: chat.lastMessageId,
        lastMessageTime: chat.lastMessageTime
      }));
      localStorage.setItem('chats', JSON.stringify(serializedChats));
      logger.info('Chats saved to localStorage');
    } catch (error) {
      logger.error('Failed to save chats:', error);
    }
  }

  // Save participants to localStorage
  private static saveParticipants(): void {
    try {
      localStorage.setItem('chat_participants', JSON.stringify(this.participants));
    } catch (error) {
      logger.error('Failed to save participants:', error);
    }
  }

  // Save messages to localStorage
  private static saveMessages(): void {
    try {
      // Create a serializable version of messages
      const serializedMessages: Record<string, SerializedMessage[]> = {};
      Object.entries(this.messages).forEach(([chatId, messages]) => {
        serializedMessages[chatId] = messages.map(msg => ({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: msg.timestamp,
          readBy: msg.readBy
        }));
      });
      localStorage.setItem('chat_messages', JSON.stringify(serializedMessages));
      logger.debug('Messages saved to localStorage', {
        chatCount: Object.keys(serializedMessages).length,
        totalMessages: Object.values(serializedMessages).reduce((sum, msgs) => sum + msgs.length, 0)
      });
    } catch (error) {
      logger.error('Failed to save messages:', error);
    }
  }

  // Helper method to get user by ID (this should be replaced with actual user service call)
  private static getUserById(userId: string): { name: string } | null {
    // This is a placeholder - you should implement this using your UserService
    return { name: 'User' };
  }

  // Clear all chat data from localStorage
  static clearCache(): void {
    try {
      localStorage.removeItem('chats');
      localStorage.removeItem('chat_messages');
      localStorage.removeItem('chat_participants');
      this.chats = [];
      this.messages = {};
      this.participants = [];
      logger.info('Chat cache cleared');
    } catch (error) {
      logger.error('Failed to clear chat cache:', error);
    }
  }
} 