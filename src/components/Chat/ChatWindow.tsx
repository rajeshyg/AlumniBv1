import React, { useEffect, useRef, useState } from 'react';
import { Chat, ChatMessage } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Button } from '../ui/button';
import { Send, Paperclip, MoreVertical, Users, X, UserPlus, MoreHorizontal, Reply, Edit, Trash2, ArrowLeft } from 'lucide-react';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Search } from 'lucide-react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface ChatWindowProps {
  chat: Chat;
  onBack?: () => void;
  isMobile?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack, isMobile }) => {
  const { authState } = useAuth();
  const { device } = useThemeStore();
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
  const [isLoading, setIsLoading] = useState(true);

  const {
    messages,
    sendMessage,
    markAsRead,
    addTypingUser,
    removeTypingUser,
    typingUsers,
    refreshChats,
    loadMessages
  } = useChatStore();

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
    const loadChatMessages = async () => {
      try {
        setIsLoading(true);
        if (authState.currentUser) {
          logger.debug('Loading messages for chat:', {
            chatId: chat.id,
            chatName: chat.name
          });

          // Load messages from Supabase
          const { data: messageData, error: messageError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });

          if (messageError) {
            logger.error('Error loading messages:', messageError);
            return;
          }

          if (messageData) {
            const formattedMessages = messageData.map((msg: any) => ({
              id: msg.id,
              chatId: msg.chat_id,
              senderId: msg.sender_id,
              content: msg.content,
              timestamp: msg.created_at,
              readBy: msg.read_by || []
            }));

            // Update messages in store
            const chatStore = useChatStore.getState();
            chatStore.messages = {
              ...chatStore.messages,
              [chat.id]: formattedMessages
            };
          }
        }
      } catch (error) {
        logger.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatMessages();
  }, [chat.id, authState.currentUser]);

  // Subscribe to real-time message updates
  useEffect(() => {
    const messageSubscription = supabase
      .channel(`chat_messages:${chat.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `chat_id=eq.${chat.id}`
      }, (payload) => {
        logger.debug('Message update received:', payload);
        loadMessages(chat.id);
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [chat.id]);

  useEffect(() => {
    // Mark messages as read when opening chat
    if (authState.currentUser) {
      markAsRead(chat.id);
    }

    // Load chat members
    loadMembers();
  }, [chat.id, authState.currentUser, chat.participants]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !authState.currentUser) return;

    try {
      await sendMessage(chat.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageSender = (message: ChatMessage): User | undefined => {
    return chatUsers[message.senderId];
  };

  const isCurrentUser = (userId: string): boolean => {
    return userId === authState.currentUser?.studentId;
  };

  const formatMessageTime = (timestamp: string): string => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatMessageDate = (timestamp: string): string => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const sender = getMessageSender(message);
    const isCurrentUserMessage = isCurrentUser(message.senderId);
    const showDate = index === 0 || !isSameDay(new Date(message.timestamp), new Date(chatMessages[index - 1].timestamp));

    return (
      <div key={message.id} className="flex flex-col">
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {formatMessageDate(message.timestamp)}
            </span>
          </div>
        )}
        <div className={cn(
          "flex",
          isCurrentUserMessage ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "max-w-[70%] rounded-lg px-4 py-2",
            isCurrentUserMessage ? "bg-blue-500 text-white" : "bg-gray-100"
          )}>
            <div className="text-sm">{message.content}</div>
            <div className={cn(
              "text-xs mt-1",
              isCurrentUserMessage ? "text-blue-100" : "text-gray-500"
            )}>
              {formatMessageTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">{chat.name}</h2>
            <p className="text-sm text-gray-500">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowMembers(true)}>
          <Users className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Container */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Members</DialogTitle>
            <DialogDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in this chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.studentId} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {member.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{member.name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 