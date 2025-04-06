import { Chat, ChatMessage, ChatParticipant } from '../models/Chat';
import { logger } from '../utils/logger';
import { UserService } from './UserService';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

interface SerializedChat {
  id: string;
  postId?: string;
  name: string;
  type: 'direct' | 'group';
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
  private static socket: Socket | null = null;
  private static currentUserId: string | null = null;
  private static socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3006';
  private static typingUsers: Record<string, Set<string>> = {};

  // Check if the service has been initialized
  static isInitialized(): boolean {
    return this.currentUserId !== null && this.socket !== null;
  }

  // Clear any cached data
  static clearCache(): void {
    logger.debug('Clearing chat service cache');
    this.socket?.disconnect();
    this.socket = null;
    this.currentUserId = null;
    this.typingUsers = {};
    
    // Reconnect if needed
    if (this.currentUserId) {
      this.initialize(this.currentUserId);
      logger.debug('Reinitialized chat service after cache clear');
    }
  }

  // Initialize service with Socket.IO
  static initialize(userId: string): void {
    try {
      this.currentUserId = userId;
      
      // Initialize Socket.IO connection with reconnection options
      this.socket = io(this.socketUrl, {
        auth: { userId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      // Setup Socket.IO event handlers
      this.setupSocketHandlers();

      logger.info('Chat service initialized', { userId });
    } catch (error) {
      logger.error('Failed to initialize chat service:', error);
    }
  }

  // Get messages for a specific chat from Supabase
  static async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      logger.debug('Getting messages for chat:', { chatId });
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error loading messages from Supabase:', error);
        return [];
      }

      if (!data || data.length === 0) {
        logger.debug('No messages found for chat:', { chatId });
        return [];
      }

      logger.debug('Loaded messages from database:', { chatId, count: data.length });
      
      return data.map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        content: msg.content,
        timestamp: msg.created_at,
        readBy: msg.read_by || []
      }));
    } catch (error) {
      logger.error('Failed to get chat messages:', error);
      return [];
    }
  }

  // Send a message in a chat
  static async sendMessage(chatId: string, senderId: string, content: string): Promise<ChatMessage> {
    try {
      logger.debug('Sending message:', { chatId, senderId, contentLength: content.length });
      
      const messageId = `msg-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      const message: ChatMessage = {
        id: messageId,
        chatId,
        senderId,
        content,
        timestamp,
        readBy: [senderId]
      };

      // Try to insert message into Supabase
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          id: message.id,
          chat_id: message.chatId,
          sender_id: message.senderId,
          content: message.content,
          created_at: message.timestamp,
          updated_at: message.timestamp,
          read_by: message.readBy
        })
        .select()
        .single();

      if (error) {
        logger.error('Error inserting message into Supabase:', error);
        logger.warn('Returning fake message due to database error');
        // Still return the message so the UI can display it
        return message;
      }

      // Try to update chat's last message
      const { error: updateError } = await supabase
        .from('chats')
        .update({
          last_message_id: message.id,
          last_message_time: message.timestamp,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (updateError) {
        logger.error('Error updating chat last message:', updateError);
      }

      // Send message through Socket.IO for real-time updates
      if (this.socket) {
        logger.debug('Emitting message through Socket.IO:', message);
        this.socket.emit('send_message', message);
      } else {
        logger.warn('Socket not connected, cannot send real-time update');
      }

      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      
      // Create a fallback message
      const messageId = `msg-error-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      const fallbackMessage: ChatMessage = {
        id: messageId,
        chatId,
        senderId,
        content,
        timestamp,
        readBy: [senderId]
      };
      
      logger.warn('Returning fallback message due to exception:', fallbackMessage);
      return fallbackMessage;
    }
  }

  // Create a new chat (for both group and 1-1)
  static async createChat(
    name: string, 
    participants: string[], 
    postId: string = '', 
    type: 'direct' | 'group' = 'group'
  ): Promise<Chat> {
    try {
      logger.debug(`Creating new chat "${name}" with participants:`, participants);
      
      // Generate a unique ID for the chat
      const chatId = `chat-${Date.now()}`;
      
      // Prepare chat object for Supabase
      const newChat = {
        id: chatId,
        post_id: postId,
        name,
        type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_id: null,
        last_message_time: null
      };

      // Try to insert chat into Supabase
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert(newChat)
        .select()
        .single();

      if (chatError) {
        logger.error('Error creating chat in Supabase:', {
          error: chatError,
          message: chatError.message,
          details: chatError.details
        });
        
        // Return a local chat object even if database insertion failed
        logger.debug('Returning local chat object after database error');
        return {
          id: chatId,
          postId: postId,
          name,
          type,
          participants,
          createdAt: newChat.created_at,
          updatedAt: newChat.updated_at,
          lastMessageId: undefined,
          lastMessageTime: undefined
        };
      }

      logger.debug('Chat created successfully in database:', {
        chatId: chatData.id,
        name: chatData.name
      });
      
      // Try to add participants
      const participantAddSuccess = await this.addParticipantsToChat(chatId, participants);
      if (!participantAddSuccess) {
        logger.error('Failed to add all participants to chat:', {
          chatId,
          participants
        });
      }

      // Convert to local format and return
      const chat: Chat = {
        id: chatData.id,
        postId: chatData.post_id,
        name: chatData.name,
        type: chatData.type,
        participants, // Use the participants array we tried to add
        createdAt: chatData.created_at,
        updatedAt: chatData.updated_at,
        lastMessageId: chatData.last_message_id,
        lastMessageTime: chatData.last_message_time
      };
      
      logger.debug('Returning chat:', chat);
      return chat;
    } catch (error) {
      logger.error('Error in createChat:', error);
      
      // Create a fallback chat to ensure the UI can continue to function
      const fallbackChatId = `fallback-chat-${Date.now()}`;
      
      logger.debug('Returning fallback chat due to error');
      return {
        id: fallbackChatId,
        name,
        type,
        participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  // Helper to add participants to a chat
  private static async addParticipantsToChat(chatId: string, participants: string[]): Promise<boolean> {
    try {
      logger.debug('Adding participants to chat:', { chatId, participants });
      
      const participantRecords = participants.map(userId => ({
        chat_id: chatId,
        user_id: userId,
        joined_at: new Date().toISOString()
      }));

      // Insert all participants
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participantRecords);

      if (participantError) {
        logger.error('Error adding participants:', {
          error: participantError,
          message: participantError.message
        });
        return false;
      }
      
      logger.debug('Successfully added participants to chat');
      return true;
    } catch (error) {
      logger.error('Error in addParticipantsToChat:', error);
      return false;
    }
  }

  // Add typing indicator
  static addTypingUser(chatId: string, userId: string): void {
    try {
      if (!this.typingUsers[chatId]) {
        this.typingUsers[chatId] = new Set();
      }
      this.typingUsers[chatId].add(userId);
    } catch (error) {
      logger.error('Failed to add typing user:', error);
    }
  }

  // Remove typing indicator
  static removeTypingUser(chatId: string, userId: string): void {
    try {
      if (this.typingUsers[chatId]) {
        this.typingUsers[chatId].delete(userId);
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

  // Get user's chats from Supabase
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      logger.debug('Getting user chats from Supabase:', { userId });
      
      // Try to fetch existing chats
      try {
        logger.debug('Fetching chats for user:', { userId });
        
        // Query for all chats where this user is a participant
        const { data: participantData, error: participantError } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', userId);
          
        if (participantError) {
          logger.error('Error querying chat_participants:', {
            error: participantError,
            message: participantError.message
          });
          return [];
        }
        
        if (!participantData || participantData.length === 0) {
          logger.debug('No chat participants found for user');
          return [];
        }
        
        const chatIds = participantData.map((p: { chat_id: string }) => p.chat_id);
        logger.debug('Found chat IDs:', chatIds);
        
        // Get chat details
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .in('id', chatIds);
          
        if (chatError) {
          logger.error('Error querying chats:', {
            error: chatError,
            message: chatError.message
          });
          return [];
        }
        
        if (!chatData || chatData.length === 0) {
          logger.debug('No chats found for user');
          return [];
        }
        
        // Get all participants for these chats
        const { data: allParticipants, error: allParticipantsError } = await supabase
          .from('chat_participants')
          .select('*')
          .in('chat_id', chatIds);
          
        if (allParticipantsError) {
          logger.error('Error fetching all participants:', {
            error: allParticipantsError,
            message: allParticipantsError.message
          });
          return [];
        }
        
        // Convert to the format expected by the store
        const chats: Chat[] = chatData.map((chat: any) => {
          // Get participants for this chat
          const chatParticipants = allParticipants
            ? allParticipants.filter((p: any) => p.chat_id === chat.id)
                              .map((p: any) => p.user_id)
            : [userId];
          
          return {
            id: chat.id,
            name: chat.name,
            type: chat.type || 'direct',
            participants: chatParticipants,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
            lastMessageId: chat.last_message_id,
            lastMessageTime: chat.last_message_time
          };
        });
        
        logger.debug('Returning chats from database:', { count: chats.length });
        return chats;
      } catch (dbError) {
        logger.error('Failed to query database:', dbError);
        return [];
      }
    } catch (error) {
      logger.error('Error in getUserChats:', error);
      return [];
    }
  }

  // Get unread message count for a chat
  static async getUnreadMessageCount(chatId: string, userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chatId)
        .not('read_by', 'cs', `{${userId}}`); // Using studentId for read_by

      if (error) {
        logger.error('Error getting unread message count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      logger.error('Failed to get unread message count:', error);
      return 0;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      logger.debug('Marking messages as read:', { chatId, userId });
      
      // Simple validation
      if (!chatId || !userId) {
        logger.error('Invalid parameters for markMessagesAsRead:', { chatId, userId });
        return;
      }
      
      // Try to get unread messages
      const { data: messages, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, read_by')
        .eq('chat_id', chatId)
        .not('read_by', 'cs', `{${userId}}`); // Using userId for read_by

      if (fetchError) {
        logger.error('Error fetching unread messages:', fetchError);
        return;
      }
      
      // No messages to mark as read
      if (!messages || messages.length === 0) {
        logger.debug('No unread messages found:', { chatId, userId });
        return;
      }
      
      logger.debug(`Found ${messages.length} messages to mark as read:`, { 
        chatId, 
        messageIds: messages.map(m => m.id)
      });

      // Update each message's read_by array
      const updatePromises = messages.map(async (message) => {
        try {
          const readBy = message.read_by || [];
          if (!readBy.includes(userId)) {
            const { error: updateError } = await supabase
              .from('chat_messages')
              .update({ read_by: [...readBy, userId] })
              .eq('id', message.id);

            if (updateError) {
              logger.error('Error marking message as read:', { 
                error: updateError, 
                messageId: message.id 
              });
            } else {
              logger.debug('Marked message as read:', { messageId: message.id });
            }
          }
        } catch (error) {
          logger.error('Error in message update:', { error, messageId: message.id });
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      logger.debug('All messages marked as read:', { 
        chatId, 
        count: messages.length 
      });
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  }

  // Subscribe to message updates
  static subscribeToMessageUpdates(callback: (chatId: string) => void): void {
    if (!this.socket) {
      logger.error('Cannot subscribe to message updates: Socket not initialized');
      return;
    }

    this.socket.on('message_update', (chatId: string) => {
      logger.debug('Received message update for chat:', chatId);
      callback(chatId);
    });
  }

  // Setup Socket.IO event handlers
  private static setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('Socket.IO connected');
    });

    this.socket.on('disconnect', () => {
      logger.warn('Socket.IO disconnected');
    });

    this.socket.on('error', (error) => {
      logger.error('Socket.IO error:', error);
    });
  }
} 