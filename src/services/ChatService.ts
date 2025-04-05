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
  private static messageUpdateCallbacks: ((chatId: string) => void)[] = [];
  private static typingUsers: Record<string, Set<string>> = {};
  private static storageKey = 'alumbiBv1_chat_';

  // Initialize chats from storage
  static initialize(): void {
    try {
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

      // Setup shared message server
      this.setupSharedMessageServer();

      // Set up message polling
      this.startMessagePolling();

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

  // Setup shared message server simulation
  private static setupSharedMessageServer(): void {
    // Check if we're in development mode
    if (process.env.NODE_ENV !== 'production') {
      // Check for message server in sessionStorage
      const messageServer = sessionStorage.getItem('__alumbiBv1_shared_message_server');
      
      if (!messageServer) {
        // Create the shared message server and store in sessionStorage
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'about:blank';
        
        document.body.appendChild(iframe);
        
        if (iframe.contentWindow) {
          // Create a polling function in the iframe's window
          const sharedMessageServerCode = `
            (function() {
              window.messages = {};
              window.addMessage = function(chatId, message) {
                if (!window.messages[chatId]) {
                  window.messages[chatId] = [];
                }
                // Check for duplicates
                const exists = window.messages[chatId].some(m => m.id === message.id);
                if (!exists) {
                  window.messages[chatId].push(message);
                  localStorage.setItem('__alumbiBv1_shared_messages', JSON.stringify(window.messages));
                  return true;
                }
                return false;
              };
              window.getMessages = function(chatId) {
                return window.messages[chatId] || [];
              };
              window.getAllMessages = function() {
                return window.messages;
              };
              
              // Initialize from localStorage if available
              const savedMessages = localStorage.getItem('__alumbiBv1_shared_messages');
              if (savedMessages) {
                try {
                  window.messages = JSON.parse(savedMessages);
                } catch (e) {
                  console.error('Failed to parse saved messages:', e);
                  window.messages = {};
                }
              }
              
              console.log('Shared message server initialized');
            })();
          `;
          
          const iframeDoc = iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(`<script>${sharedMessageServerCode}</script>`);
          iframeDoc.close();
          
          // Store the iframe reference
          sessionStorage.setItem('__alumbiBv1_shared_message_server', 'true');
          
          logger.debug('Created shared message server');
        }
      }
    }
  }

  // Add message to shared server
  private static addMessageToSharedServer(chatId: string, message: ChatMessage): boolean {
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        if (iframe.contentWindow) {
          const win = iframe.contentWindow as any;
          if (win.addMessage) {
            return win.addMessage(chatId, message);
          }
        }
      }
      return false;
    } catch (error) {
      logger.error('Failed to add message to shared server:', error);
      return false;
    }
  }

  // Get messages from shared server
  private static getMessagesFromSharedServer(chatId: string): ChatMessage[] {
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        if (iframe.contentWindow) {
          const win = iframe.contentWindow as any;
          if (win.getMessages) {
            return win.getMessages(chatId) || [];
          }
        }
      }
      return [];
    } catch (error) {
      logger.error('Failed to get messages from shared server:', error);
      return [];
    }
  }

  // Get all messages from shared server
  private static getAllMessagesFromSharedServer(): Record<string, ChatMessage[]> {
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        if (iframe.contentWindow) {
          const win = iframe.contentWindow as any;
          if (win.getAllMessages) {
            return win.getAllMessages() || {};
          }
        }
      }
      return {};
    } catch (error) {
      logger.error('Failed to get all messages from shared server:', error);
      return {};
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

  // Start polling for new messages
  private static startMessagePolling(): void {
    setInterval(() => {
      this.pollForNewMessages();
    }, 1000); // Poll every second for better responsiveness
  }

  // Poll for new messages
  private static async pollForNewMessages(): Promise<void> {
    try {
      const savedMessages = localStorage.getItem(this.storageKey + 'messages');
      if (savedMessages) {
        logger.debug('Polling found messages in storage:', savedMessages.substring(0, 100) + '...');
        
        const storedMessages: Record<string, SerializedMessage[]> = JSON.parse(savedMessages);
        let hasUpdates = false;

        // Update messages for each chat
        Object.entries(storedMessages).forEach(([chatId, messages]) => {
          const currentMessages = this.messages[chatId] || [];
          logger.debug(`Chat ${chatId}: ${messages.length} stored messages, ${currentMessages.length} current messages`);
          
          const newMessages = messages.filter(msg => 
            !currentMessages.some(current => current.id === msg.id)
          );

          if (newMessages.length > 0) {
            logger.debug(`Found ${newMessages.length} new messages for chat ${chatId}:`, JSON.stringify(newMessages));
            
            this.messages[chatId] = [...currentMessages, ...newMessages].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            hasUpdates = true;
            
            // Add new messages to shared server
            newMessages.forEach(msg => this.addMessageToSharedServer(chatId, msg));
            
            this.messageUpdateCallbacks.forEach(callback => callback(chatId));
          }
        });

        if (hasUpdates) {
          logger.debug('New messages found during polling');
        }
      } else {
        logger.debug('No messages found in storage during polling');
      }

      // Also check shared server for new messages
      if (process.env.NODE_ENV !== 'production') {
        const sharedMessages = this.getAllMessagesFromSharedServer();
        
        if (Object.keys(sharedMessages).length > 0) {
          logger.debug('Found messages in shared server:', JSON.stringify(Object.keys(sharedMessages)));
          
          let hasUpdates = false;
          
          Object.entries(sharedMessages).forEach(([chatId, messages]) => {
            const currentMessages = this.messages[chatId] || [];
            
            const newMessages = messages.filter(msg => 
              !currentMessages.some(current => current.id === msg.id)
            );
            
            if (newMessages.length > 0) {
              logger.debug(`Found ${newMessages.length} new messages from shared server for chat ${chatId}`);
              
              this.messages[chatId] = [...currentMessages, ...newMessages].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              
              hasUpdates = true;
              
              // Save to localStorage
              this.saveMessages();
              
              // Notify subscribers
              this.messageUpdateCallbacks.forEach(callback => callback(chatId));
            }
          });
          
          if (hasUpdates) {
            logger.debug('Updated messages from shared server');
          }
        }
      }

      // Check for typing indicators
      const savedTyping = localStorage.getItem(this.storageKey + 'typing');
      if (savedTyping) {
        try {
          const typingData = JSON.parse(savedTyping);
          // Convert JSON back to Sets
          Object.keys(typingData).forEach(chatId => {
            this.typingUsers[chatId] = new Set(typingData[chatId]);
          });
        } catch (e) {
          logger.error('Failed to parse typing data', e);
        }
      }
    } catch (error) {
      logger.error('Error polling for messages:', error);
    }
  }

  // Subscribe to message updates
  static subscribeToMessageUpdates(callback: (chatId: string) => void): void {
    this.messageUpdateCallbacks.push(callback);
  }

  // Unsubscribe from message updates
  static unsubscribeFromMessageUpdates(callback: (chatId: string) => void): void {
    const index = this.messageUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageUpdateCallbacks.splice(index, 1);
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

  // Send a message in a chat
  static sendMessage(chatId: string, senderId: string, content: string): ChatMessage {
    try {
      logger.debug('Sending message:', { chatId, senderId, contentLength: content.length });
      
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        readBy: [senderId]
      };

      logger.debug('Created message object:', JSON.stringify(message));

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
        chat.lastMessage = message;

        logger.debug('Saving message to storage with key:', this.storageKey + 'messages');
        
        // Log the state before saving
        const currentStorageValue = localStorage.getItem(this.storageKey + 'messages');
        logger.debug('Current storage state:', currentStorageValue || 'empty');

        // Save all changes to localStorage
        this.saveMessages();
        this.saveChats();
        
        // Log the state after saving
        const newStorageValue = localStorage.getItem(this.storageKey + 'messages');
        logger.debug('New storage state:', newStorageValue || 'empty');
        
        // Add to shared server
        if (process.env.NODE_ENV !== 'production') {
          const added = this.addMessageToSharedServer(chatId, message);
          logger.debug('Added message to shared server:', added ? 'success' : 'failed');
        }
        
        // Verify the chat has participants
        logger.debug('Chat participants:', JSON.stringify(chat.participants));
        
        // Notify subscribers about the new message
        this.messageUpdateCallbacks.forEach(callback => callback(chatId));
        
        logger.debug('Message saved and chat updated:', { 
          chatId, 
          messageId: message.id,
          lastMessageTime: chat.lastMessageTime
        });
      } else {
        logger.error('Chat not found when sending message:', { chatId });
        throw new Error('Chat not found');
      }

      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
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