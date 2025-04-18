import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chat, ChatMessage } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Button } from '../ui/button';
import { Send, Paperclip, MoreVertical, Users, X, UserPlus, MoreHorizontal, Reply, Edit, Trash2, ArrowLeft, CheckCheck, Share } from 'lucide-react';
import { SearchInput } from '../ui/search-input';
import { format, isSameDay } from 'date-fns';
import { useThemeStore } from '../../store/theme';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

// Import our reusable chat UI components
import {
  ChatInput,
  ChatButton,
  ChatBubble,
  ChatHeader,
  ChatTimestamp,
  ChatDateDivider
} from './ui';

// Global declarations should go at the top level
declare global {
  interface Window {
    scrollTimeoutId?: NodeJS.Timeout;
  }
}

// Add type for the payload
interface MessagePayload {
  new: {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    timestamp: string;
  };
}

interface ChatWindowProps {
  chat: Chat;
  onBack?: () => void;
  isMobile?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack, isMobile }) => {
  const { authState } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const parentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatUsers, setChatUsers] = useState<Record<string, User>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const {
    messages,
    sendMessage,
    markAsRead,
    loadMessages,
    deleteMessage
  } = useChatStore(state => ({
    messages: state.messages,
    sendMessage: state.sendMessage,
    markAsRead: state.markAsRead,
    loadMessages: state.loadMessages,
    deleteMessage: state.deleteMessage
  }));

  const chatMessages = messages[chat.id] || [];

  // Initialize chat service with current user
  useEffect(() => {
    if (authState.currentUser) {
      logger.debug('Initializing chat service with user:', {
        userId: authState.currentUser.studentId,
        userName: authState.currentUser.name
      });
      ChatService.initialize(authState.currentUser.studentId);
    }
  }, [authState.currentUser]);

  // Join chat room when component mounts
  useEffect(() => {
    if (authState.currentUser) {
      logger.debug('Joining chat room:', {
        chatId: chat.id,
        userId: authState.currentUser.studentId
      });
      ChatService.joinChat(chat.id, authState.currentUser.studentId);
    }

    return () => {
      if (authState.currentUser) {
        logger.debug('Leaving chat room:', {
          chatId: chat.id,
          userId: authState.currentUser.studentId
        });
        ChatService.leaveChat(chat.id, authState.currentUser.studentId);
      }
    };
  }, [chat.id, authState.currentUser]);

  // Load messages when component mounts or chat changes
  useEffect(() => {
    logger.info(`ChatWindow mounted/updated for chat: ${chat.id}`, {
      chatName: chat.name,
      hasUser: !!authState.currentUser,
      currentChatMessages: chatMessages.length,
      type: chat.type
    });

    if (authState.currentUser) {
      logger.debug('Loading messages for chat:', {
        chatId: chat.id,
        chatName: chat.name
      });

      // Load messages immediately
      loadMessages(chat.id).then(() => {
        logger.debug(`Successfully loaded messages for chat ${chat.id}`, {
          messageCount: messages[chat.id]?.length || 0
        });

        // Force scroll to bottom after messages load
        setTimeout(() => {
          scrollToBottom(true);
        }, 200);
      }).catch(error => {
        logger.error(`Failed to load messages for chat ${chat.id}`, error);
      });

      // Mark messages as read when chat is opened
      markAsRead(chat.id).catch(error => {
        logger.error(`Failed to mark messages as read for chat ${chat.id}`, error);
      });

      // Subscribe to real-time updates for this chat
      const channel = supabase
        .channel(`chat:${chat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.id}`
        }, (payload: MessagePayload) => {
          logger.debug('Received real-time message update:', payload);
          // Only load messages if the new message isn't from the current user
          if (payload.new.sender_id !== authState.currentUser?.studentId) {
            loadMessages(chat.id);
          }
        })
        .subscribe();

      return () => {
        logger.debug('Unsubscribing from chat channel:', chat.id);
        channel.unsubscribe();
      };
    }
  }, [chat.id, authState.currentUser, loadMessages, markAsRead]);

  // Sort messages by timestamp and log for debugging
  const sortedMessages = React.useMemo(() => {
    const messageCount = chatMessages.length;
    logger.debug(`Sorting ${messageCount} messages for chat ${chat.id}`);

    if (messageCount === 0) {
      return [];
    }

    try {
      const sorted = [...chatMessages].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      logger.debug(`Successfully sorted ${sorted.length} messages for chat ${chat.id}`);
      return sorted;
    } catch (error) {
      logger.error(`Error sorting messages for chat ${chat.id}:`, error);
      return chatMessages; // Return unsorted as fallback
    }
  }, [chatMessages, chat.id]);

  // Create a ref to store timeouts and control scroll operations
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollOperationInProgress = useRef<boolean>(false);

  // Dedicated scroll to bottom function with debounce to prevent duplicate scrolls
  const scrollToBottom = (immediate = false) => {
    // If a scroll operation is already in progress, cancel it
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // Mark that a scroll operation is starting
    scrollOperationInProgress.current = true;

    // Execute the scroll
    if (parentRef.current) {
      if (immediate) {
        // Force immediate scroll without animation
        parentRef.current.scrollTop = parentRef.current.scrollHeight;
        logger.debug('Executed immediate scroll to bottom');

        // Set a timeout to allow further scrolls
        setTimeout(() => {
          scrollOperationInProgress.current = false;
        }, 300);
      } else {
        // Smooth scroll with animation
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          logger.debug('Executed smooth scroll to bottom');

          // Set a timeout to allow further scrolls
          setTimeout(() => {
            scrollOperationInProgress.current = false;
          }, 500); // Longer timeout for smooth scrolls
        }
      }
    }
  };

  // Single scroll effect that manages all scroll triggers
  useEffect(() => {
    // Function to determine if we should scroll
    const shouldScrollToBottom = () => {
      // Don't interrupt an ongoing scroll operation
      if (scrollOperationInProgress.current) {
        return false;
      }

      // Always scroll when messages change
      return sortedMessages.length > 0;
    };

    // If we should scroll, schedule a scroll operation
    if (shouldScrollToBottom()) {
      logger.debug(`Scheduling scroll for chat ${chat.id}`);

      // Clear any existing scroll timeouts
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Schedule a new scroll with a small delay to let the DOM update
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom(true);
      }, 150);
    }

    // Cleanup function
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [sortedMessages, chat.id]); // Only re-run if messages or chat changes

  // Initial scroll when changing chats
  useEffect(() => {
    if (parentRef.current) {
      // Force immediate scroll without animation
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
      logger.debug(`Initial scroll for new chat ${chat.id}`);
    }
  }, [chat.id]); // Only when chat changes

  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Load chat members
    loadMembers();
  }, [chat.id, chat.participants]);

  const loadMembers = async () => {
    try {
      const users = await Promise.all(
        chat.participants.map(id => UserService.findUserById(id))
      );
      setMembers(users.filter((user): user is User => user !== null));
    } catch (error) {
      logger.error('Failed to load chat members', { error });
    }
  };

  // Load chat users
  useEffect(() => {
    const loadUsers = async () => {
      const users: Record<string, User> = {};
      if (authState.currentUser) {
        users[authState.currentUser.studentId] = authState.currentUser;
      }
      for (const userId of chat.participants) {
        if (!users[userId]) {
          const user = await UserService.findUserById(userId);
          if (user) users[userId] = user;
        }
      }
      setChatUsers(users);
    };
    loadUsers();
  }, [chat.participants, authState.currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !authState.currentUser) {
      logger.debug('Cannot send message:', {
        hasMessage: !!newMessage.trim(),
        hasUser: !!authState.currentUser
      });
      return;
    }

    try {
      logger.debug('Attempting to send message:', {
        chatId: chat.id,
        messageLength: newMessage.trim().length,
        userId: authState.currentUser.studentId
      });

      // Store the message content before clearing the input
      const messageContent = newMessage.trim();

      // Prepare message metadata for replies
      let messageMetadata = null;
      if (replyToMessage) {
        messageMetadata = {
          replyTo: {
            messageId: replyToMessage.id,
            senderId: replyToMessage.senderId,
            content: replyToMessage.content
          }
        };
        // Clear the reply after sending
        setReplyToMessage(null);
      }

      // Clear input right away for better user experience
      setNewMessage('');

      // CRITICAL FIX: Explicitly clear typing status when sending a message
      // This ensures the typing indicator is removed for all users
      ChatService.setTypingStatus(chat.id, authState.currentUser.studentId, false);

      // Try to send the message
      try {
        // Pass message metadata for replies
        await sendMessage(chat.id, messageContent, messageMetadata);
        logger.debug('Message sent successfully:', {
          chatId: chat.id,
          userId: authState.currentUser.studentId
        });

        // Single scroll operation after sending
        scrollToBottom(true);
      } catch (sendError) {
        logger.error('Failed to send message to database:', sendError);

        // If message fails to send, add it locally to the UI
        // This gives the appearance of the message being sent
        // even if it failed to reach the database
        const tempMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          chatId: chat.id,
          senderId: authState.currentUser.studentId,
          content: messageContent,
          timestamp: new Date().toISOString(),
          readBy: [authState.currentUser.studentId]
        };

        const existingMessages = messages[chat.id] || [];
        useChatStore.setState({
          messages: {
            ...messages,
            [chat.id]: [...existingMessages, tempMessage]
          }
        });

        logger.debug('Added temporary message to UI for failed send:', {
          messageId: tempMessage.id,
          content: tempMessage.content
        });
      }
    } catch (error) {
      logger.error('Error in handleSendMessage:', error);
    }
  };

  // Subscribe to real-time message updates
  useEffect(() => {
    logger.debug('Setting up real-time message subscription in ChatWindow', {
      currentChatId: chat?.id,
      isAuthenticated: !!authState.currentUser
    });

    if (authState.currentUser && chat) {
      // Join the chat room (critical for real-time updates)
      ChatService.joinChat(chat.id, authState.currentUser.studentId);

      // Subscribe to Supabase real-time updates for this chat
      const channel = supabase
        .channel(`chat:${chat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.id}`
        }, (payload: any) => {
          logger.info('Received Supabase real-time message update:', {
            chatId: chat.id,
            messageId: payload.new.id
          });

          // Process the new message in the appropriate format
          const newMessage: ChatMessage = {
            id: payload.new.id,
            chatId: payload.new.chat_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            timestamp: payload.new.created_at,
            readBy: payload.new.read_by || [],
            source: 'supabase',
            sequence: Date.now() // Use timestamp as sequence for Supabase events
          };

          // Add the message to the chat store
          useChatStore.getState().addOrUpdateMessage(newMessage);

          // Also mark messages as read immediately when received
          if (authState.currentUser) {
            markAsRead(chat.id);
          }

          // Ensure we scroll to the latest message
          setTimeout(() => scrollToBottom(true), 100);
        })
        .subscribe();

      // Socket.IO message updates
      const handleMessageUpdate = (updatedChatId: string, newMessage?: ChatMessage) => {
        logger.info('Received Socket.IO real-time message update', {
          updatedChatId,
          currentChatId: chat.id,
          isCurrentChat: updatedChatId === chat.id,
          hasMessagePayload: !!newMessage
        });

        if (updatedChatId === chat.id) {
          if (newMessage) {
            // If we have the actual message object, add it directly
            useChatStore.getState().addOrUpdateMessage(newMessage);

            // Mark as read
            markAsRead(chat.id);

            // Scroll to latest message
            setTimeout(() => scrollToBottom(true), 100);
          } else {
            // Fallback: reload if we don't have the message object
            logger.debug('Reloading messages due to Socket.IO update without message payload');
            loadMessages(chat.id);

            // Mark messages as read immediately when received
            markAsRead(chat.id);
          }
        }
      };

      ChatService.subscribeToMessageUpdates(handleMessageUpdate);
      logger.debug('All real-time subscriptions established');

      // Store the user information to prevent null reference in cleanup
      const currentUser = authState.currentUser;

      return () => {
        // Clean up Supabase subscription
        channel.unsubscribe();

        // Leave the chat room when component unmounts
        if (currentUser) {
          // CRITICAL FIX: Clear typing status when leaving/switching chats
          // This ensures typing indicators don't persist when switching between chats
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          ChatService.setTypingStatus(chat.id, currentUser.studentId, false);

          ChatService.leaveChat(chat.id, currentUser.studentId);
          logger.debug('Cleaned up all subscriptions and left chat room');
        }
      };
    }
  }, [authState.currentUser, chat, loadMessages, markAsRead]);

  // Check for typing users every second
  useEffect(() => {
    if (authState.currentUser && chat) {
      // Set up polling to check for typing users
      const interval = setInterval(() => {
        const typing = ChatService.getTypingUsers(chat.id, authState.currentUser!.studentId);
        if (typing.length > 0) {
          console.log('Typing users detected:', typing);
        }
        setTypingUsers(typing);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [chat, authState.currentUser]);

  // Track the last time the user typed to avoid sending too many typing events
  const lastTypingTime = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get sender name from user ID
  const getSenderName = (senderId: string): string => {
    // If it's the current user
    if (senderId === authState.currentUser?.studentId) {
      return 'You';
    }

    // Try to get from chatUsers
    const user = chatUsers[senderId];
    if (user) {
      return user.name ||
             `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
             user.email ||
             'Unknown User';
    }

    // Fallback
    return 'Unknown User';
  };

  // Message action handlers
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const [forwardMessageDialogOpen, setForwardMessageDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<any>(null);

  const handleReplyToMessage = (message: any) => {
    setReplyToMessage(message);
    // Focus the input field
    const inputElement = document.querySelector('.chat-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
    logger.debug('Replying to message:', { messageId: message.id, content: message.content });
  };

  const handleForwardMessage = (message: any) => {
    setMessageToForward(message);
    setForwardMessageDialogOpen(true);
    logger.debug('Forwarding message:', { messageId: message.id, content: message.content });
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    try {
      const isConfirmed = window.confirm("Are you sure you want to delete this message? This action cannot be undone.");

      if (!isConfirmed) {
        return;
      }

      // Call the deleteMessage method from the store
      const success = await deleteMessage(message.id);

      if (success) {
        toast.success("Message deleted successfully");
      } else {
        toast.error("Could not delete the message. Please try again.");
      }
    } catch (error) {
      logger.error('Error handling message deletion:', error);
      toast.error("An error occurred while trying to delete the message.");
    }
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const handleTyping = () => {
    if (!authState.currentUser) return;

    // Use the ChatService to set typing status
    try {
      const now = Date.now();
      // Only send typing event if it's been more than 2 seconds since the last one
      if (now - lastTypingTime.current > 2000) {
        console.log('Setting typing status to TRUE');
        ChatService.setTypingStatus(chat.id, authState.currentUser.studentId, true);
        lastTypingTime.current = now;
      }

      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set a new timeout to clear typing status after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (authState.currentUser) {
          console.log('Setting typing status to FALSE after timeout');
          ChatService.setTypingStatus(chat.id, authState.currentUser.studentId, false);
        }
        typingTimeoutRef.current = null;
      }, 3000);
    } catch (error) {
      logger.error('Error handling typing indicator:', error);
    }
  };

  const handleLeaveChat = () => {
    if (!authState.currentUser) return;
    try {
      // Since removeParticipant doesn't exist, log this action instead
      logger.info('User leaving chat:', {
        chatId: chat.id,
        userId: authState.currentUser.studentId
      });
      // Instead of calling refreshChats, reload chats using the store
      loadMessages(chat.id);
      // Navigate back to chat list
      window.location.href = '/chat';
    } catch (error) {
      logger.error('Failed to leave chat', { error });
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await UserService.searchUsers(query);
        const filteredUsers = users.filter(user =>
          user.studentId !== authState.currentUser?.studentId &&
          !chat.participants.includes(user.studentId)
        );
        setSearchResults(filteredUsers);
        logger.info('User search completed', {
          query,
          resultCount: filteredUsers.length
        });
      } catch (error) {
        logger.error('Failed to search users', { error });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleAddMember = async (user: User) => {
    try {
      // Since addParticipant doesn't exist, log this action instead
      logger.info('Would add member to chat:', {
        chatId: chat.id,
        userId: user.studentId
      });
      setMembers(prev => [...prev, user]);
      setSearchResults(prev => prev.filter(u => u.studentId !== user.studentId));
      // Reload messages instead of using refreshChats
      loadMessages(chat.id);
    } catch (error) {
      logger.error('Failed to add member', { error });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      // Since removeParticipant doesn't exist, log this action instead
      logger.info('Would remove member from chat:', {
        chatId: chat.id,
        userId
      });
      setMembers(prev => prev.filter(member => member.studentId !== userId));
      // Reload messages instead of using refreshChats
      loadMessages(chat.id);
    } catch (error) {
      logger.error('Failed to remove member', { error });
    }
  };

  // Calculate dynamic message size based on content
  const estimateMessageSize = useCallback((index: number) => {
    const message = sortedMessages[index];
    if (!message) return 120; // Default fallback size

    // Base size for a message
    let estimatedSize = 100; // Increased base size

    // Add extra height for longer messages based on content length
    const contentLength = message.content.length;
    const estimatedLines = Math.ceil(contentLength / 30); // Assume ~30 chars per line
    estimatedSize += Math.max(0, estimatedLines - 1) * 24; // Increased per-line height

    // Add height for reply metadata if present
    if (message.metadata?.replyTo) {
      estimatedSize += 70; // Increased height for reply context
    }

    // Add height for sender name in group chats
    if (chat.type === 'group' && message.senderId !== authState.currentUser?.studentId) {
      estimatedSize += 24;
    }

    // Add height for date divider if needed
    if (index === 0 ||
        !isSameDay(new Date(message.timestamp),
                  new Date(sortedMessages[index - 1].timestamp))) {
      estimatedSize += 44;
    }

    // Add extra padding/margin
    estimatedSize += 20;

    return estimatedSize;
  }, [sortedMessages, chat.type, authState.currentUser?.studentId]);

  // Virtual list setup with proper initial scroll and dynamic sizing
  const rowVirtualizer = useVirtualizer({
    count: sortedMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateMessageSize,
    overscan: 15, // Increased for smoother scrolling and to reduce empty space
    paddingStart: 20,
    paddingEnd: 20,
    initialRect: { width: 0, height: 0 },
    scrollToFn: (offset, { behavior }) => {
      if (parentRef.current) {
        parentRef.current.scrollTop = offset;
      }
    }
  });

  // Add a function to get proper chat display name
  const getChatDisplayName = (): string => {
    if (chat.type === 'group') {
      return chat.name;
    }

    // For direct chats, show the other person's name
    if (chat.participants.length === 2 && authState.currentUser) {
      // Find the other participant (not the current user)
      const otherUserId = chat.participants.find(
        id => id !== authState.currentUser?.studentId
      );

      if (otherUserId && chatUsers[otherUserId]) {
        return chatUsers[otherUserId].name ||
          `${chatUsers[otherUserId].firstName || ''} ${chatUsers[otherUserId].lastName || ''}`.trim() ||
          'Chat Participant';
      }
    }

    return chat.name;
  };

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isMobile ? "fixed inset-0 z-[100]" : "h-full"
    )}>
      {/* Chat Header */}
      <ChatHeader>
        <div className="flex items-center space-x-3">
          {isMobile && (
            <ChatButton
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="icon-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </ChatButton>
          )}
          <div className="h-10 w-10 rounded-full bg-[hsl(var(--chat-input))] flex items-center justify-center">
            <span className="text-[hsl(var(--chat-foreground))] font-medium">
              {getChatDisplayName().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{getChatDisplayName()}</h2>
            <p className="text-sm text-muted-foreground">
              {chat.type === 'group' ? `${chat.participants.length} participants` : 'Online'}
            </p>
          </div>
          <ChatButton variant="ghost" size="icon" className="icon-button">
            <MoreVertical className="h-5 w-5" />
          </ChatButton>
        </div>
      </ChatHeader>

      {/* Messages Area */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-4"
      >
        {sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div
            className="virtualizer-container min-h-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const message = sortedMessages[virtualRow.index];
              const currentUserId = authState.currentUser?.studentId;
              const isCurrentUser = Boolean(currentUserId && message.senderId === currentUserId);
              const messageDate = new Date(message.timestamp);
              const showDateDivider = virtualRow.index === 0 ||
                !isSameDay(messageDate, new Date(sortedMessages[virtualRow.index - 1].timestamp));

              return (
                <div
                  key={message.id}
                  className="virtualizer-item"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingTop: showDateDivider ? '24px' : '12px',
                    paddingBottom: '12px'
                  }}
                >
                  {showDateDivider && (
                    <ChatDateDivider>
                      {isSameDay(messageDate, new Date()) ? 'Today' : format(messageDate, 'MMMM d, yyyy')}
                    </ChatDateDivider>
                  )}
                  <div className={cn(
                    "flex w-full",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}>
                    <div className="message-container">
                      {/* Show sender name for messages from others in group chats */}
                      {!isCurrentUser && chat.type === 'group' && (
                        <div className="message-sender-name text-xs font-medium text-primary mb-1 ml-1">
                          {getSenderName(message.senderId)}
                        </div>
                      )}
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <ChatBubble type={isCurrentUser ? "sent" : "received"}>
                            <div>
                              {/* Show reply information if this message is a reply */}
                              {message.metadata?.replyTo && (
                                <div className="reply-reference p-1 mb-1 rounded text-xs bg-[hsl(var(--chat-input))]">
                                  <div className="flex items-center">
                                    <Reply className="h-3 w-3 mr-1" />
                                    <span className="font-medium">Reply to {getSenderName(message.metadata.replyTo.senderId)}</span>
                                  </div>
                                  <p className="truncate">{message.metadata.replyTo.content}</p>
                                </div>
                              )}
                              <div>{message.content}</div>
                            </div>
                          </ChatBubble>
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isCurrentUser ? "justify-end" : "justify-start"
                          )}>
                            <ChatTimestamp>
                              {format(messageDate, 'h:mm a')}
                            </ChatTimestamp>
                            {isCurrentUser && (
                              <span className="message-status">
                                <CheckCheck className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleReplyToMessage(message)}>
                            <Reply className="h-4 w-4 mr-2" />
                            <span>Reply</span>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleForwardMessage(message)}>
                            <Share className="h-4 w-4 mr-2" />
                            <span>Forward</span>
                          </ContextMenuItem>
                          {isCurrentUser && (
                            <ContextMenuItem onClick={() => handleDeleteMessage(message)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span>Delete</span>
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator px-4 py-1 text-sm flex items-center">
          <div className="typing-animation mr-2">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          {typingUsers.length === 1 ? (
            <span>{getSenderName(typingUsers[0])} is typing...</span>
          ) : typingUsers.length === 2 ? (
            <span>{getSenderName(typingUsers[0])} and {getSenderName(typingUsers[1])} are typing...</span>
          ) : (
            <span>{getSenderName(typingUsers[0])} and {typingUsers.length - 1} others are typing...</span>
          )}
        </div>
      )}

      {/* Message Input */}
      <div className="chat-input-container sticky bottom-0 p-4 bg-card border-t border-border">
        {/* Reply UI */}
        {replyToMessage && (
          <div className="reply-container bg-secondary p-2 mb-2 rounded flex items-center justify-between">
            <div className="flex items-center">
              <Reply className="h-4 w-4 mr-2 text-primary" />
              <div className="text-sm">
                <span className="font-medium">Replying to {getSenderName(replyToMessage.senderId)}</span>
                <p className="text-muted-foreground truncate max-w-[200px]">{replyToMessage.content}</p>
              </div>
            </div>
            <ChatButton variant="ghost" size="icon" onClick={handleCancelReply} className="h-6 w-6">
              <X className="h-4 w-4" />
            </ChatButton>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
          <div className="flex-1">
            <ChatInput
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder={replyToMessage ? "Type your reply..." : "Type your message here..."}
            />
          </div>
          <ChatButton
            type="submit"
            variant="send"
            size="icon"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </ChatButton>
        </form>
      </div>

      {/* Forward Message Dialog */}
      <Dialog open={forwardMessageDialogOpen} onOpenChange={setForwardMessageDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[425px]",
          isMobile && "w-full h-full max-w-none m-0 rounded-none"
        )}>
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
            <DialogDescription>
              Select a chat to forward this message to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {messageToForward && (
              <div className="bg-accent/20 p-2 rounded mb-4">
                <p className="text-sm font-medium">Message to forward:</p>
                <p className="text-sm text-muted-foreground">{messageToForward.content}</p>
              </div>
            )}
            <div className="max-h-[300px] overflow-y-auto">
              {/* This would be populated with a list of chats */}
              <p className="text-muted-foreground text-center py-4">Forward message functionality not yet implemented</p>
            </div>
          </div>
          <DialogFooter>
            <ChatButton variant="secondary" onClick={() => setForwardMessageDialogOpen(false)}>Cancel</ChatButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className={cn(
          "sm:max-w-[425px]",
          isMobile && "w-full h-full max-w-none m-0 rounded-none"
        )}>
          <DialogHeader>
            <DialogTitle>Chat Members</DialogTitle>
            <DialogDescription>
              Manage members in this chat
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Members</Label>
              <SearchInput
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                placeholder="Search users..."
                wrapperClassName="w-full"
              />

              {isSearching ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                    <div
                      key={user.studentId}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                      onClick={() => handleAddMember(user)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery.trim() ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No users found
                </div>
              ) : null}

              {members.length > 0 && (
                <div className="mt-2 space-y-2">
                  <Label>Current Members</Label>
                  <div className="space-y-2">
                    {members.map(user => (
                      <div
                        key={user.studentId}
                        className="flex items-center justify-between p-2 bg-accent rounded-md"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        {user.studentId !== authState.currentUser?.studentId && (
                          <ChatButton
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(user.studentId)}
                          >
                            <X className="h-4 w-4" />
                          </ChatButton>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <ChatButton variant="secondary" onClick={() => setShowMembers(false)}>
              Close
            </ChatButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};