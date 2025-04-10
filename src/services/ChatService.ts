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

// Global callback for message updates - allows direct store updates from anywhere
let globalMessageCallback: ((chatId: string, message?: ChatMessage, source?: 'socket' | 'supabase') => void) | null = null;

export class ChatService {
  private static socket: Socket | null = null;
  private static currentUserId: string | null = null;
  private static socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3006';
  private static typingUsers: Record<string, Set<string>> = {};
  private static processedMessageIds = new Set<string>();
  private static recentMessageContents = new Map<string, number>();
  private static messageSequence = 0; // For tracking message order

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

  // Manually reconnect to socket server
  static reconnect(): boolean {
    try {
      logger.info('Manually reconnecting to Socket.IO server');

      if (!this.currentUserId) {
        logger.error('Cannot reconnect: No user ID available');
        return false;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        logger.debug('Disconnecting existing socket connection');
        this.socket.disconnect();
        this.socket = null;
      }

      // Reinitialize the connection
      this.initialize(this.currentUserId);

      // Just return true - we've tried our best to reconnect
      logger.info('Manual reconnection attempt completed');
      return true;
    } catch (error) {
      logger.error('Error during manual reconnection:', error);
      return false;
    }
  }

  // Initialize service with Socket.IO
  static initialize(userId: string): void {
    try {
      this.currentUserId = userId;

      // Log actual URL being used (not just the configured one)
      const actualSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3006';
      logger.info('Initializing Socket.IO connection', {
        configuredUrl: this.socketUrl,
        actualUrl: actualSocketUrl,
        envVariable: import.meta.env.VITE_SOCKET_URL ? 'defined' : 'undefined'
      });

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

      // Add a timeout to check if connection was successful
      setTimeout(() => {
        if (this.socket?.connected) {
          logger.info('Socket.IO connection verified as connected', { socketId: this.socket.id });
        } else {
          logger.warn('Socket.IO connection not established after timeout', {
            connected: this.socket?.connected,
            socketId: this.socket?.id
          });
        }
      }, 3000);

      // CRITICAL: Set up a periodic health check to ensure socket stays connected
      const healthCheckIntervalId = setInterval(() => {
        if (!this.socket?.connected && this.currentUserId) {
          logger.warn('Socket disconnected during health check - forcing reconnection');
          this.socket?.connect();
        }
      }, 30000); // Check every 30 seconds

      // Store the interval ID so we can clear it if needed
      // @ts-ignore - Adding custom property to socket
      this.socket._healthCheckIntervalId = healthCheckIntervalId;

      logger.info('Chat service initialized', { userId, socketConnected: !!this.socket });
    } catch (error) {
      logger.error('Failed to initialize chat service:', error);
    }
  }

  // Cleanup on socket destruction
  static cleanup(): void {
    if (this.socket) {
      // @ts-ignore - Clear health check interval
      if (this.socket._healthCheckIntervalId) {
        // @ts-ignore
        clearInterval(this.socket._healthCheckIntervalId);
      }

      this.socket.disconnect();
      this.socket = null;
      this.currentUserId = null;
      this.typingUsers = {};
      globalMessageCallback = null;
      logger.debug('Chat service cleaned up');
    }
  }

  // Get messages for a specific chat from Supabase
  static async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      logger.debug('Getting messages for chat:', { chatId });

      // Validate input
      if (!chatId) {
        logger.error('Invalid chatId provided to getChatMessages');
        return [];
      }

      // Add retry logic for network failures
      let retries = 0;
      const maxRetries = 3;
      let data;
      let error;

      while (retries < maxRetries) {
        try {
          const response = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

          data = response.data;
          error = response.error;

          // If successful or there's a non-network error, break out of retry loop
          if (data || (error && error.code !== 'NETWORK_ERROR')) {
            break;
          }
        } catch (e) {
          logger.warn(`Network error fetching messages (attempt ${retries + 1}/${maxRetries}):`, e);
        }

        // Exponential backoff before retrying
        const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      }

      if (error) {
        logger.error('Error loading messages from Supabase:', {
          error,
          chatId,
          retryAttempts: retries
        });
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
        readBy: msg.read_by || [],
        // Add source tracking to help with debugging
        source: 'supabase'
      }));
    } catch (error) {
      logger.error('Failed to get chat messages:', {
        error,
        chatId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // Generate a unique message ID
  private static generateUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `msg-${timestamp}-${random}`;
  }

  // Send a message in a chat
  static async sendMessage(chatId: string, senderId: string, content: string): Promise<ChatMessage> {
    try {
      logger.debug('Sending message:', { chatId, senderId, contentLength: content.length });

      const messageId = this.generateUniqueId();
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
        logger.info('Socket.IO status before sending message:', {
          connected: this.socket.connected,
          id: this.socket.id
        });

        logger.debug('Emitting message through Socket.IO:', message);
        this.socket.emit('send_message', message);

        // Check if we've actually joined the chat room
        logger.debug('Attempting to emit to chat room:', chatId);
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

  // Set typing status and emit to other users
  static setTypingStatus(chatId: string, userId: string, isTyping: boolean): void {
    try {
      logger.debug('Setting typing status:', { chatId, userId, isTyping });

      // Update local typing indicator state
      if (isTyping) {
        this.addTypingUser(chatId, userId);
      } else {
        this.removeTypingUser(chatId, userId);
      }

      // Emit typing status to other users if socket is connected
      if (this.socket) {
        // CRITICAL FIX: Always use the 'typing' event with isTyping flag
        // instead of separate 'typing' and 'stop_typing' events
        this.socket.emit('typing', { chatId, userId, isTyping });
        logger.debug('Emitted typing status via Socket.IO:', { isTyping });
      } else {
        logger.warn('Socket not connected, cannot emit typing status');
      }
    } catch (error) {
      logger.error('Failed to set typing status:', error);
    }
  }

  // Join a chat room for real-time updates
  static joinChat(chatId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      logger.debug('Joining chat room:', { chatId, userId });

      // First leave any existing rooms to prevent issues
      this.leaveChat(chatId, userId);

      // Join the specific chat room
      this.socket.emit('join_chat', chatId);

      // IMPORTANT: Also join a user-specific room to ensure messages reach this client
      // This is critical for real-time updates even if room joining fails
      this.socket.emit('join_user_room', userId);

      // Log that we've attempted to join
      logger.info('Join chat room commands sent for:', { chatId, userId });
    } else {
      logger.warn('Cannot join chat: Socket not connected', {
        socketExists: !!this.socket,
        connected: this.socket?.connected
      });

      // Try to reconnect if socket exists but isn't connected
      if (this.socket && !this.socket.connected && this.currentUserId) {
        logger.info('Attempting to reconnect socket before joining chat');
        this.socket.connect();
      }
    }
  }

  // Leave a chat room
  static leaveChat(chatId: string, userId: string): void {
    if (this.socket && this.socket.connected) {
      logger.debug('Leaving chat room:', { chatId, userId });
      this.socket.emit('leave_chat', chatId);
    } else {
      logger.debug('Cannot leave chat: Socket not connected', {
        socketExists: !!this.socket,
        connected: this.socket?.connected
      });
    }
  }

  // Get user's chats from Supabase
  static async getUserChats(userId: string): Promise<Chat[]> {
    try {
      logger.debug('Getting user chats from Supabase:', { userId });

      // Validate input
      if (!userId) {
        logger.error('Invalid userId provided to getUserChats');
        return [];
      }

      // Try to fetch existing chats with retry logic
      let retries = 0;
      const maxRetries = 3;

      // Variables to store our query results
      let participantData: any = null;
      let chatData: any = null;
      let allParticipants: any = null;
      let allParticipantsError: any = null;

      while (retries < maxRetries) {
        try {
          logger.debug(`Fetching chats for user (attempt ${retries + 1}/${maxRetries}):`, { userId });

          // Query for all chats where this user is a participant
          const participantResponse = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', userId);

          if (participantResponse.error) {
            // If it's a network error, retry
            if (participantResponse.error.code === 'NETWORK_ERROR') {
              logger.warn(`Network error fetching chat participants (attempt ${retries + 1}/${maxRetries}):`, participantResponse.error);
              retries++;
              // Exponential backoff before retrying
              const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              continue;
            }

            logger.error('Error querying chat_participants:', {
              error: participantResponse.error,
              message: participantResponse.error.message,
              userId
            });
            return [];
          }

          participantData = participantResponse.data;

          if (!participantData || participantData.length === 0) {
            logger.debug('No chat participants found for user:', { userId });
            return [];
          }

          const chatIds = participantData.map((p: { chat_id: string }) => p.chat_id);
          logger.debug('Found chat IDs:', { userId, chatIds, count: chatIds.length });

          // Get chat details
          const chatResponse = await supabase
            .from('chats')
            .select('*')
            .in('id', chatIds);

          if (chatResponse.error) {
            // If it's a network error, retry
            if (chatResponse.error.code === 'NETWORK_ERROR') {
              logger.warn(`Network error fetching chats (attempt ${retries + 1}/${maxRetries}):`, chatResponse.error);
              retries++;
              // Exponential backoff before retrying
              const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              continue;
            }

            logger.error('Error querying chats:', {
              error: chatResponse.error,
              message: chatResponse.error.message,
              userId,
              chatIds
            });
            return [];
          }

          chatData = chatResponse.data;

          if (!chatData || chatData.length === 0) {
            logger.debug('No chats found for user:', { userId, chatIds });
            return [];
          }

          // Get all participants for these chats
          const participantsResponse = await supabase
            .from('chat_participants')
            .select('*')
            .in('chat_id', chatIds);

          allParticipants = participantsResponse.data;
          allParticipantsError = participantsResponse.error;

          // If we got this far, we've successfully retrieved the data
          // Break out of the retry loop
          break;
        } catch (e) {
          logger.warn(`Exception fetching chats (attempt ${retries + 1}/${maxRetries}):`, e);
          retries++;

          if (retries >= maxRetries) {
            logger.error('Max retries exceeded fetching chats:', { userId, maxRetries });
            return [];
          }

          // Exponential backoff before retrying
          const backoffTime = Math.min(1000 * Math.pow(2, retries), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }

      if (allParticipantsError) {
        logger.error('Error fetching all participants:', {
          error: allParticipantsError,
          message: allParticipantsError.message
        });
        return [];
      }

      // CRITICAL FIX: Get the last message for each chat
      // This ensures the chat list shows the correct last message preview
      const lastMessagesPromises = chatData.map(async (chat: any) => {
        try {
          // Even if there's no last_message_id, try to get the most recent message
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (error || !data) {
            if (chat.last_message_id) {
              logger.error('Error fetching last message:', {
                chatId: chat.id,
                messageId: chat.last_message_id,
                error
              });
            } else {
              logger.debug('No messages found for chat:', chat.id);
            }
            return null;
          }

          // If we found a message but it's not the one referenced by last_message_id,
          // update the chat record to fix the inconsistency
          if (chat.last_message_id && chat.last_message_id !== data.id) {
            logger.warn('Fixing inconsistent last_message_id for chat:', {
              chatId: chat.id,
              storedLastMessageId: chat.last_message_id,
              actualLastMessageId: data.id
            });

            // Update the chat record with the correct last message ID
            await supabase
              .from('chats')
              .update({
                last_message_id: data.id,
                last_message_time: data.created_at,
                updated_at: new Date().toISOString()
              })
              .eq('id', chat.id);
          }

          return {
            id: data.id,
            chatId: data.chat_id,
            senderId: data.sender_id,
            content: data.content,
            timestamp: data.created_at,
            readBy: data.read_by || [],
            // Add source tracking to help with debugging
            source: 'supabase'
          };
        } catch (err) {
          logger.error('Exception fetching last message:', err);
          return null;
        }
      });

      // Wait for all last message queries to complete
      const lastMessages = await Promise.all(lastMessagesPromises);

      // Convert to the format expected by the store
      const chats: Chat[] = chatData.map((chat: any, index: number) => {
        // Get participants for this chat
        const chatParticipants = allParticipants
          ? allParticipants.filter((p: any) => p.chat_id === chat.id)
                            .map((p: any) => p.user_id)
          : [userId];

        // Get the last message for this chat
        const lastMessage = lastMessages[index];

        return {
          id: chat.id,
          name: chat.name,
          type: chat.type || 'direct',
          participants: chatParticipants,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          lastMessageId: chat.last_message_id,
          lastMessageTime: chat.last_message_time,
          lastMessage: lastMessage || undefined
        };
      });

      logger.debug('Returning chats from database:', { count: chats.length });
      return chats;
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

  // Clear the processed IDs periodically
  static {
    setInterval(() => {
      logger.debug(`Clearing processed message cache. Size: ${ChatService.processedMessageIds.size}`);
      ChatService.processedMessageIds.clear();

      // Also clear content cache
      logger.debug(`Clearing message content cache. Size: ${ChatService.recentMessageContents.size}`);
      ChatService.recentMessageContents.clear();
    }, 5 * 60 * 1000); // Clear every 5 minutes
  }

  // Subscribe to message updates with robust duplicate prevention
  static subscribeToMessageUpdates(callback: (chatId: string, message?: ChatMessage, source?: 'socket' | 'supabase') => void): void {
    if (!this.socket) {
      logger.error('Cannot subscribe to message updates: Socket not initialized');
      return;
    }

    // Store the callback globally to allow direct calls from socket handlers
    globalMessageCallback = callback;
    logger.debug('Set global message callback');

    // Remove existing listeners to prevent duplicates
    this.socket.off('message_update');
    this.socket.off('new_message');

    // Listen for new messages directly
    this.socket.on('new_message', (message: any) => {
      logger.debug('Received new_message event from socket:', {
        messageId: message.id,
        chatId: message.chatId,
        senderId: message.senderId
      });

      // Add source information
      message.source = 'socket';
      message.sequence = this.messageSequence++;

      // Process the message through our duplicate prevention logic
      this.processNewMessageEvent(message);
    });

    // Also listen for message_update events as a fallback
    this.socket.on('message_update', (chatId: string) => {
      logger.debug('Received message_update event for chat:', chatId);
      callback(chatId, undefined, 'socket');
    });

    // CRITICAL: Check connection status and reconnect if needed
    if (!this.socket.connected && this.currentUserId) {
      logger.warn('Socket not connected during subscription - attempting reconnection');
      this.socket.connect();
    }

    logger.debug('Subscribed to real-time message updates with enhanced duplicate prevention');
  }

  // Process a new message event with duplicate prevention
  private static processNewMessageEvent(message: any): void {
    // 1. Check ID-based duplication
    if (this.processedMessageIds.has(message.id)) {
      logger.debug('Ignoring duplicate message by ID:', message.id);
      return;
    }

    // 2. Check content + chat based duplication within a time window
    const contentKey = `${message.chatId}:${message.senderId}:${message.content}`;
    const now = Date.now();
    const recentTimestamp = this.recentMessageContents.get(contentKey);

    if (recentTimestamp && now - recentTimestamp < 5000) {
      logger.debug('Ignoring duplicate message by content+time:', {
        content: message.content,
        chatId: message.chatId,
        timeSinceLastSimilar: now - recentTimestamp + 'ms'
      });
      return;
    }

    // Add to processed trackers
    this.processedMessageIds.add(message.id);
    this.recentMessageContents.set(contentKey, now);

    // Set expiration for the message ID (clear after 10 minutes)
    setTimeout(() => {
      this.processedMessageIds.delete(message.id);
    }, 10 * 60 * 1000);

    logger.debug('Received direct new message event:', {
      chatId: message.chatId,
      messageId: message.id,
      source: message.source || 'unknown',
      content: message.content?.substring(0, 20) + (message.content?.length > 20 ? '...' : '')
    });

    // Convert to ChatMessage format if needed
    const chatMessage: ChatMessage = {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      timestamp: message.timestamp,
      readBy: message.readBy || [],
      sequence: message.sequence || this.messageSequence++,
      source: message.source || 'unknown'
    };

    // Call the global callback if available
    if (globalMessageCallback) {
      logger.debug('Calling global message callback with message:', message.id);

      // CRITICAL: Force a small delay to ensure the message is processed
      // after any UI state changes. This helps with race conditions.
      setTimeout(() => {
        globalMessageCallback(message.chatId, chatMessage, chatMessage.source as 'socket' | 'supabase');
      }, 10);
    } else {
      logger.warn('No global message callback available to process message:', message.id);
    }
  }

  // Setup Socket.IO event handlers
  private static setupSocketHandlers(): void {
    if (!this.socket) {
      logger.error('Cannot setup Socket.IO handlers: Socket is null');
      return;
    }

    this.socket.on('connect', () => {
      logger.info('Socket.IO connected successfully', {
        socketId: this.socket?.id,
        connected: this.socket?.connected
      });
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Socket.IO connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket.IO disconnected', { reason });
    });

    this.socket.on('error', (error) => {
      logger.error('Socket.IO error:', error);
    });

    // Add handler for new messages - CRITICAL for real-time updates
    this.socket.on('new_message', (message: any) => {
      logger.debug('Received new message via Socket.IO directly:', {
        chatId: message.chatId,
        messageId: message.id,
        content: message.content?.substring(0, 20) + '...'
      });

      // Process the message through our duplicate prevention logic
      this.processNewMessageEvent(message);
    });

    // Add handler for typing indicators
    this.socket.on('typing', ({chatId, userId, isTyping}: {chatId: string, userId: string, isTyping: boolean}) => {
      logger.debug('Received typing indicator:', { chatId, userId, isTyping });

      // CRITICAL FIX: Ensure we update the typing status correctly
      if (isTyping) {
        this.addTypingUser(chatId, userId);
        logger.debug('Added typing user', {
          chatId, userId,
          currentTypingUsers: this.typingUsers[chatId] ? Array.from(this.typingUsers[chatId]) : []
        });
      } else {
        this.removeTypingUser(chatId, userId);
        logger.debug('Removed typing user', {
          chatId, userId,
          currentTypingUsers: this.typingUsers[chatId] ? Array.from(this.typingUsers[chatId]) : []
        });
      }

      // Force a refresh of the typing users list
      // This ensures the UI updates immediately
      if (globalMessageCallback) {
        // Use a small delay to ensure the typing state is updated first
        setTimeout(() => {
          globalMessageCallback(chatId);
        }, 10);
      }
    });

    logger.debug('Socket.IO event handlers set up successfully');
  }

  // Helper method to check if socket server is running
  static async checkSocketServerStatus(): Promise<{ running: boolean; url: string }> {
    try {
      const url = this.socketUrl;
      logger.debug('Checking Socket.IO server status:', url);

      // Try to make a simple HTTP request to the socket server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const running = response.ok || response.status === 404; // Socket.IO often returns 404 but is still running
      logger.info('Socket.IO server status check:', {
        url,
        running,
        status: response.status
      });

      return { running, url };
    } catch (error) {
      logger.error('Error checking Socket.IO server:', error);
      return { running: false, url: this.socketUrl };
    }
  }

  // Get debug info about the socket connection
  static getSocketInfo(): any {
    return {
      socketExists: !!this.socket,
      socketUrl: this.socketUrl,
      currentUserId: this.currentUserId,
      typingUsersCount: Object.keys(this.typingUsers).length
    };
  }

  // Add helper to check if socket is connected
  static isSocketConnected(): boolean {
    // @ts-ignore - Socket.IO has a connected property but TypeScript doesn't recognize it
    return !!this.socket && this.socket.connected === true;
  }

  // Add an unsubscribe method to clean up event listeners
  static unsubscribeFromMessageUpdates(): void {
    if (!this.socket) {
      logger.error('Cannot unsubscribe from message updates: Socket not initialized');
      return;
    }

    // Remove existing listeners
    this.socket.off('message_update');
    this.socket.off('new_message');

    // IMPORTANT: Check connection and reconnect if needed
    if (!this.socket.connected && this.currentUserId) {
      logger.warn('Socket not connected during unsubscribe - attempting reconnection');
      this.socket.connect();
    }

    logger.debug('Unsubscribed from real-time message updates');
  }
}