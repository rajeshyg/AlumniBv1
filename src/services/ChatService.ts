import { Chat, ChatMessage, ChatParticipant } from '../models/Chat';
import { logger } from '../utils/logger';
import { UserService } from './UserService';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

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
  private static messageUpdateCallbacks: ((chatId: string) => void)[] = [];
  private static typingUsers: Record<string, Set<string>> = {};
  private static storageKey = 'alumbiBv1_chat_';
  private static socket: Socket | null = null;
  private static currentUserId: string | null = null;
  private static socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3006';

  // Initialize chats from storage and setup Socket.IO
  static initialize(userId: string): void {
    try {
      this.currentUserId = userId;
      
      // Initialize Socket.IO connection
      this.socket = io(this.socketUrl, {
        auth: { userId }
      });

      // Setup Socket.IO event handlers
      this.setupSocketHandlers();

      // Load from shared storage
      const savedChats = sessionStorage.getItem(this.storageKey + 'chats') || localStorage.getItem(this.storageKey + 'chats');
      if (savedChats) {
        const serializedChats: SerializedChat[] = JSON.parse(savedChats);
        this.chats = serializedChats.map(chat => ({
          ...chat,
          lastMessage: undefined
        }));
      }

      const savedMessages = sessionStorage.getItem(this.storageKey + 'messages') || localStorage.getItem(this.storageKey + 'messages');
      if (savedMessages) {
        const serializedMessages: Record<string, SerializedMessage[]> = JSON.parse(savedMessages);
        this.messages = serializedMessages;
      }

      const savedParticipants = sessionStorage.getItem(this.storageKey + 'participants') || localStorage.getItem(this.storageKey + 'participants');
      if (savedParticipants) {
        this.participants = JSON.parse(savedParticipants);
      }

      // Add storage event listener for cross-tab/browser sync
      window.addEventListener('storage', this.handleStorageChange.bind(this));

      logger.info('Chat service initialized', {
        chatCount: this.chats.length,
        messageCount: Object.keys(this.messages).length,
        participantCount: this.participants.length
      });
    } catch (error) {
      logger.error('Failed to initialize chats:', error);
      this.chats = [];
      this.messages = {};
      this.participants = [];
    }
  }

  // Setup Socket.IO event handlers
  private static setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      logger.warn('Disconnected from chat server');
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      logger.debug('Received new message:', message);
      this.handleNewMessage(message);
      
      // Notify all subscribers about the new message
      this.messageUpdateCallbacks.forEach(callback => {
        try {
          callback(message.chatId);
          logger.debug('Notified subscriber about new message in chat:', message.chatId);
        } catch (error) {
          logger.error('Error in message update callback:', error);
        }
      });
    });

    this.socket.on('user_typing', ({ chatId, userId }: { chatId: string; userId: string }) => {
      logger.debug('User started typing:', { chatId, userId });
      this.handleTypingStart(chatId, userId);
    });

    this.socket.on('stopTyping', ({ chatId, userId }: { chatId: string; userId: string }) => {
      logger.debug('User stopped typing:', { chatId, userId });
      this.handleTypingStop(chatId, userId);
    });

    this.socket.on('userJoined', ({ chatId, userId }: { chatId: string; userId: string }) => {
      logger.debug('User joined chat:', { chatId, userId });
      this.handleUserJoined(chatId, userId);
    });

    this.socket.on('userLeft', ({ chatId, userId }: { chatId: string; userId: string }) => {
      logger.debug('User left chat:', { chatId, userId });
      this.handleUserLeft(chatId, userId);
    });
  }

  // Handle new message from server
  private static handleNewMessage(message: ChatMessage): void {
    if (!this.messages[message.chatId]) {
      this.messages[message.chatId] = [];
    }
    this.messages[message.chatId].push(message);
    this.saveMessages();
    this.messageUpdateCallbacks.forEach(callback => callback(message.chatId));
  }

  // Handle typing start
  private static handleTypingStart(chatId: string, userId: string): void {
    if (!this.typingUsers[chatId]) {
      this.typingUsers[chatId] = new Set();
    }
    this.typingUsers[chatId].add(userId);
  }

  // Handle typing stop
  private static handleTypingStop(chatId: string, userId: string): void {
    if (this.typingUsers[chatId]) {
      this.typingUsers[chatId].delete(userId);
    }
  }

  // Handle user joined
  private static handleUserJoined(chatId: string, userId: string): void {
    this.addParticipant(chatId, userId);
  }

  // Handle user left
  private static handleUserLeft(chatId: string, userId: string): void {
    this.removeParticipant(chatId, userId);
  }

  // Send a message in a chat
  static sendMessage(chatId: string, senderId: string, content: string): ChatMessage {
    try {
      logger.debug('Sending message:', { chatId, senderId, contentLength: content.length });
      
      const message: ChatMessage = {
        id: uuidv4(),
        chatId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        readBy: [senderId]
      };

      // Send message through Socket.IO
      if (this.socket) {
        logger.debug('Emitting message through Socket.IO:', message);
        this.socket.emit('send_message', message);
      } else {
        logger.warn('Socket not connected, message will not be sent to server');
      }

      // Update local state
      if (!this.messages[chatId]) {
        this.messages[chatId] = [];
      }
      this.messages[chatId].push(message);

      // Update chat's lastMessage and timestamps
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.lastMessageId = message.id;
        chat.lastMessageTime = message.timestamp;
        chat.updatedAt = new Date().toISOString();
        chat.lastMessage = message;
        this.saveChats();
      }

      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  // Set typing status
  static setTypingStatus(chatId: string, userId: string, isTyping: boolean): void {
    if (this.socket) {
      if (isTyping) {
        this.socket.emit('typing', { chatId, userId });
      } else {
        this.socket.emit('stop_typing', { chatId, userId });
      }
    }
  }

  // Join a chat room
  static joinChat(chatId: string, userId: string): void {
    if (this.socket) {
      logger.debug('Joining chat room:', { chatId, userId });
      this.socket.emit('join_chat', chatId);
    }
  }

  // Leave a chat room
  static leaveChat(chatId: string, userId: string): void {
    if (this.socket) {
      logger.debug('Leaving chat room:', { chatId, userId });
      this.socket.emit('leave_chat', chatId);
    }
  }

  // Handle storage changes from other tabs/windows
  private static handleStorageChange(event: StorageEvent): void {
    logger.debug('Storage event detected:', { 
      key: event.key,
      oldValue: event.oldValue?.substring(0, 50) + '...',
      newValue: event.newValue?.substring(0, 50) + '...',
    });
    
    if (!event.key?.startsWith(this.storageKey)) return;

    try {
      if (event.key === this.storageKey + 'messages' && event.newValue) {
        logger.debug('Processing messages storage change');
        
        const newMessages: Record<string, SerializedMessage[]> = JSON.parse(event.newValue);
        let hasUpdates = false;

        Object.entries(newMessages).forEach(([chatId, messages]) => {
          const currentMessages = this.messages[chatId] || [];
          const newMsgs = messages.filter(msg => 
            !currentMessages.some(current => current.id === msg.id)
          );

          if (newMsgs.length > 0) {
            logger.debug(`Found ${newMsgs.length} new messages from storage event for chat ${chatId}`);
            
            this.messages[chatId] = [...currentMessages, ...newMsgs].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          logger.debug('Notifying subscribers about new messages from storage event');
          this.messageUpdateCallbacks.forEach(callback => callback(Object.keys(newMessages)[0]));
        }
      }
    } catch (error) {
      logger.error('Error handling storage change:', error);
    }
  }

  // Save to both localStorage and sessionStorage
  private static saveToStorage(key: string, value: any): void {
    const fullKey = this.storageKey + key;
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(fullKey, serialized);
      sessionStorage.setItem(fullKey, serialized);
    } catch (error) {
      logger.error('Failed to save to storage:', error);
    }
  }

  // Save messages
  private static saveMessages(): void {
    try {
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
      this.saveToStorage('messages', serializedMessages);
    } catch (error) {
      logger.error('Failed to save messages:', error);
    }
  }

  // Save chats
  private static saveChats(): void {
    try {
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
      this.saveToStorage('chats', serializedChats);
    } catch (error) {
      logger.error('Failed to save chats:', error);
    }
  }

  // Save participants
  private static saveParticipants(): void {
    try {
      this.saveToStorage('participants', this.participants);
    } catch (error) {
      logger.error('Failed to save participants:', error);
    }
  }

  // Get chats for a specific user with diagnostic logging
  static getUserChats(userId: string): Chat[] {
    try {
      logger.debug(`Getting chats for user ${userId}`);
      const userChats = this.chats.filter(chat => 
        chat.participants.includes(userId)
      );
      
      logger.debug(`Found ${userChats.length} chats for user ${userId}:`, 
        userChats.map(c => ({ id: c.id, name: c.name, participants: c.participants }))
      );
      
      return userChats;
    } catch (error) {
      logger.error('Failed to get user chats:', error);
      return [];
    }
  }

  // Create a new chat (for both group and 1-1)
  static createChat(name: string, participants: string[], postId: string = ''): Chat {
    try {
      logger.debug(`Creating new chat "${name}" with participants:`, participants);
      
      const chatId = `chat-${Date.now()}`;
      const newChat: Chat = {
        id: chatId,
        postId,
        name,
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessageId: undefined,
        lastMessageTime: undefined,
        lastMessage: undefined
      };

      this.chats.push(newChat);
      this.saveChats();
      
      // Initialize empty message array for this chat
      this.messages[chatId] = [];
      this.saveMessages();
      
      // Add participants
      participants.forEach(userId => {
        const participant: ChatParticipant = {
          chatId,
          userId,
          joinedAt: new Date().toISOString()
        };
        this.participants.push(participant);
      });
      this.saveParticipants();
      
      // Emit event to server to save chat and participants
      if (this.socket) {
        logger.debug('Emitting create_chat event to server:', newChat);
        this.socket.emit('create_chat', newChat);
      } else {
        logger.warn('Socket not connected, chat will not be saved to server');
      }
      
      logger.debug(`Chat created successfully with ID ${chatId}`, newChat);
      return newChat;
    } catch (error) {
      logger.error('Failed to create chat:', error);
      throw error;
    }
  }

  // Create a direct chat between two users
  static async createDirectChat(userId1: string, userId2: string): Promise<Chat> {
    try {
      logger.debug(`Creating direct chat between users ${userId1} and ${userId2}`);
      
      // Check if chat already exists
      const existingChat = this.chats.find(chat => 
        chat.participants.length === 2 && 
        chat.participants.includes(userId1) && 
        chat.participants.includes(userId2)
      );
      
      if (existingChat) {
        logger.debug('Direct chat already exists:', existingChat);
        return existingChat;
      }
      
      // Get user names for chat name
      const user1 = await UserService.findUserById(userId1);
      const user2 = await UserService.findUserById(userId2);
      
      // Create chat name as combination of first names or IDs if names not available
      const chatName = `${user1?.name || userId1}, ${user2?.name || userId2}`;
      
      return this.createChat(chatName, [userId1, userId2]);
    } catch (error) {
      logger.error('Failed to create direct chat:', error);
      throw error;
    }
  }

  // Get direct chats for a user
  static getDirectChats(userId: string): Chat[] {
    try {
      return this.chats.filter(chat => 
        chat.participants.length === 2 && 
        chat.participants.includes(userId)
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
        chat.participants.length > 2 && 
        chat.participants.includes(userId)
      );
    } catch (error) {
      logger.error('Failed to get group chats:', error);
      return [];
    }
  }

  // Get a chat by ID
  static getChat(chatId: string): Chat | null {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      
      if (chat) {
        // Get last message if available
        if (chat.lastMessageId && !chat.lastMessage) {
          const messages = this.messages[chatId] || [];
          chat.lastMessage = messages.find(m => m.id === chat.lastMessageId);
        }
      }
      
      return chat || null;
    } catch (error) {
      logger.error('Failed to get chat:', error);
      return null;
    }
  }

  // Get messages for a specific chat
  static getChatMessages(chatId: string): ChatMessage[] {
    try {
      // Always get fresh messages from localStorage
      const savedMessages = localStorage.getItem(this.storageKey + 'messages');
      if (savedMessages) {
        const storedMessages: Record<string, SerializedMessage[]> = JSON.parse(savedMessages);
        if (storedMessages[chatId]) {
          this.messages[chatId] = storedMessages[chatId];
        }
      }
      return this.messages[chatId] || [];
    } catch (error) {
      logger.error('Failed to get chat messages:', error);
      return [];
    }
  }

  // Add a participant to a chat
  static addParticipant(chatId: string, userId: string): void {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) {
        logger.error('Chat not found when adding participant');
        throw new Error('Chat not found');
      }

      if (chat.participants.includes(userId)) {
        logger.warn('User is already a participant in this chat');
        return;
      }

      // Add user to participants
      chat.participants.push(userId);
      this.participants.push({
        chatId,
        userId,
        joinedAt: new Date().toISOString()
      });

      this.saveChats();
      this.saveParticipants();
      
      // Emit event to server to save participant
      if (this.socket) {
        logger.debug('Emitting add_participant event to server:', { chatId, userId });
        this.socket.emit('add_participant', { chatId, userId });
      } else {
        logger.warn('Socket not connected, participant will not be saved to server');
      }
      
      logger.info('Participant added to chat', { chatId, userId });
    } catch (error) {
      logger.error('Failed to add participant:', error);
      throw error;
    }
  }

  // Mark messages as read by a user
  static markMessagesAsRead(chatId: string, userId: string): void {
    try {
      const messages = this.messages[chatId] || [];
      let updated = false;

      messages.forEach(message => {
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
          updated = true;
        }
      });

      if (updated) {
        this.saveMessages();
        logger.debug('Messages marked as read', { chatId, userId });
      }
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  }

  // Get count of unread messages in a chat for a user
  static getUnreadMessageCount(chatId: string, userId: string): number {
    try {
      const messages = this.messages[chatId] || [];
      return messages.filter(message => !message.readBy.includes(userId)).length;
    } catch (error) {
      logger.error('Failed to get unread message count:', error);
      return 0;
    }
  }

  // Remove a participant from a chat
  static removeParticipant(chatId: string, userId: string): void {
    try {
      const chat = this.chats.find(c => c.id === chatId);
      if (!chat) {
        logger.error('Chat not found when removing participant');
        throw new Error('Chat not found');
      }

      // Remove user from chat.participants
      chat.participants = chat.participants.filter(id => id !== userId);

      // Remove participant entry
      this.participants = this.participants.filter(
        p => !(p.chatId === chatId && p.userId === userId)
      );

      this.saveChats();
      this.saveParticipants();
      
      // Emit event to server to remove participant
      if (this.socket) {
        logger.debug('Emitting remove_participant event to server:', { chatId, userId });
        this.socket.emit('remove_participant', { chatId, userId });
      } else {
        logger.warn('Socket not connected, participant will not be removed from server');
      }
      
      logger.info('Participant removed from chat', { chatId, userId });
    } catch (error) {
      logger.error('Failed to remove participant:', error);
      throw error;
    }
  }

  // Helper method to get user by ID (this should be replaced with actual user service call)
  private static getUserById(userId: string): { name: string } | null {
    return { name: `User ${userId.substring(0, 5)}` };
  }

  // Clear all chat data from localStorage
  static clearCache(): void {
    try {
      localStorage.removeItem(this.storageKey + 'chats');
      localStorage.removeItem(this.storageKey + 'messages');
      localStorage.removeItem(this.storageKey + 'participants');
      localStorage.removeItem(this.storageKey + 'typing');
      sessionStorage.removeItem(this.storageKey + 'chats');
      sessionStorage.removeItem(this.storageKey + 'messages');
      sessionStorage.removeItem(this.storageKey + 'participants');
      sessionStorage.removeItem(this.storageKey + 'typing');
      localStorage.removeItem('__alumbiBv1_shared_messages');
      this.chats = [];
      this.messages = {};
      this.participants = [];
      logger.info('Chat cache cleared');
    } catch (error) {
      logger.error('Failed to clear chat cache:', error);
    }
  }

  // Add typing indicator
  static addTypingUser(chatId: string, userId: string): void {
    try {
      if (!this.typingUsers[chatId]) {
        this.typingUsers[chatId] = new Set();
      }
      this.typingUsers[chatId].add(userId);
      
      // Convert Sets to arrays for storage
      const typingData: Record<string, string[]> = {};
      Object.keys(this.typingUsers).forEach(cid => {
        typingData[cid] = Array.from(this.typingUsers[cid]);
      });
      
      localStorage.setItem(this.storageKey + 'typing', JSON.stringify(typingData));
    } catch (error) {
      logger.error('Failed to add typing user:', error);
    }
  }

  // Remove typing indicator
  static removeTypingUser(chatId: string, userId: string): void {
    try {
      if (this.typingUsers[chatId]) {
        this.typingUsers[chatId].delete(userId);
        
        // Convert Sets to arrays for storage
        const typingData: Record<string, string[]> = {};
        Object.keys(this.typingUsers).forEach(cid => {
          typingData[cid] = Array.from(this.typingUsers[cid]);
        });
        
        localStorage.setItem(this.storageKey + 'typing', JSON.stringify(typingData));
      }
    } catch (error) {
      logger.error('Failed to remove typing user:', error);
    }
  }

  // Get typing users for a chat
  static getTypingUsers(chatId: string, currentUserId: string): string[] {
    try {
      const typingSet = this.typingUsers[chatId];
      if (!typingSet) return [];
      // Filter out current user from typing indicators
      return Array.from(typingSet).filter(id => id !== currentUserId);
    } catch (error) {
      logger.error('Failed to get typing users:', error);
      return [];
    }
  }
} 