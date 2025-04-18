import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Chat } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { UserService } from '../../services/UserService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { ChatWindow } from './ChatWindow';
import { Button } from '../ui/button';
import { Plus, Users, MessageSquare, X, UserPlus } from 'lucide-react';
import { SearchInput } from '../ui/search-input';
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
import { User } from '../../models/User';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { ChatMessage } from '../../models/Chat';

// Import our reusable chat UI components
import {
  ChatInput,
  ChatButton,
  ChatHeader
} from './ui';

// TypeScript declarations for global window object
declare global {
  interface Window {
    pendingRefreshTimeout?: NodeJS.Timeout;
    debounceReloadTimer?: NodeJS.Timeout;
  }
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface ChatStore {
  chats: Chat[];
  messages: Record<string, any[]>;
  participants: Array<{
    chatId: string;
    userId: string;
    joinedAt: string;
  }>;
}

// Interface for local component state
interface ChatPageState {
  currentChat: Chat | null;
  showNewChatDialog: boolean;
  showGroupDialog: boolean;
  selectedUsers: User[];
  userSearchQuery: string;
  searchResults: User[];
  isSearching: boolean;
  groupName: string;
  isMobile: boolean;
  searchQuery: string;
  filteredChats: Chat[];
  unreadCounts: Record<string, number>;
  chatUsers: Record<string, User>;
  isLoading: boolean;
  isRefreshing: boolean;
}

// Create a memoized chat list item component to prevent unnecessary re-renders
const ChatListItem = React.memo(({
  chat,
  isActive,
  unreadCount,
  onClick,
  getChatDisplayName,
  chatUsers,
  authState
}: {
  chat: Chat;
  isActive: boolean;
  unreadCount: number;
  onClick: (chat: Chat) => void;
  getChatDisplayName: (chat: Chat) => string;
  chatUsers: Record<string, User>;
  authState: any;
}) => {
  const displayName = getChatDisplayName(chat);

  return (
    <div
      className={cn(
        "flex items-center p-4 cursor-pointer hover:bg-accent transition-colors relative chat-list-item",
        isActive && "bg-accent active"
      )}
      onClick={() => onClick(chat)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Add keyboard accessibility
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(chat);
        }
      }}
    >
      {/* Show a subtle indicator for new messages */}
      {unreadCount > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
      )}

      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mr-3 relative">
        <span className="text-lg font-medium text-white">
          {chat.participants.length > 2 ? (
            <Users className="h-6 w-6 text-white" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </span>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "truncate text-white",
            unreadCount > 0 ? "font-bold" : "font-medium"
          )}>
            {displayName}
          </h3>
          {chat.lastMessageTime && (
            <span className={cn(
              "text-xs",
              unreadCount > 0 ? "text-white font-medium" : "text-muted-foreground"
            )}>
              {format(new Date(chat.lastMessageTime), 'h:mm a')}
            </span>
          )}
        </div>
        {chat.lastMessage && (
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "text-white" : "text-muted-foreground"
          )}>
            {chat.lastMessage.senderId === authState?.currentUser?.studentId ? 'You: ' : ''}
            {chat.lastMessage.content}
          </p>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.chat.lastMessage?.id === nextProps.chat.lastMessage?.id &&
    prevProps.chat.lastMessageTime === nextProps.chat.lastMessageTime
  );
});

/**
 * ChatPage Component
 * Main component for displaying and managing chats
 */
export const ChatPage: React.FC = () => {
  const { authState } = useAuth();

  // Use proper reactive selectors for Zustand state
  const chats = useChatStore(state => state.chats);
  const loadChats = useChatStore(state => state.loadChats);
  const loadMessages = useChatStore(state => state.loadMessages);
  const sendMessage = useChatStore(state => state.sendMessage);
  const markAsRead = useChatStore(state => state.markAsRead);
  const setCurrentUser = useChatStore(state => state.setCurrentUser);
  const storeUnreadCounts = useChatStore(state => state.unreadCounts);
  const addOrUpdateMessage = useChatStore(state => state.addOrUpdateMessage);

  // Keep track of subscription status to prevent duplicates
  const subscriptionRef = useRef<boolean>(false);

  // Local component state
  const [state, setState] = useState<ChatPageState>({
    currentChat: null,
    showNewChatDialog: false,
    showGroupDialog: false,
    selectedUsers: [],
    userSearchQuery: '',
    searchResults: [],
    isSearching: false,
    groupName: '',
    isMobile: false,
    searchQuery: '',
    filteredChats: [],
    unreadCounts: {},
    chatUsers: {},
    isLoading: true,
    isRefreshing: false
  });

  // Destructure state for easier access
  const {
    currentChat, showNewChatDialog, showGroupDialog, selectedUsers,
    userSearchQuery, searchResults, isSearching, groupName,
    isMobile, searchQuery, filteredChats, chatUsers, isLoading, isRefreshing
  } = state;

  // Update specific state properties
  const updateState = (updates: Partial<ChatPageState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Use useMemo for derived state to avoid unnecessary recalculations
  const filteredAndSortedChats = useMemo(() => {
    // Apply search filter if query exists
    let filtered = searchQuery?.trim()
      ? chats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : chats;

    // Sort by last message time
    return [...filtered].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [chats, searchQuery]);

  // Load chats without triggering excessive refreshes
  const loadUserChats = useCallback(async (forceFullLoading = false) => {
    try {
      // Only show loading indicator for initial or forced loads
      if (forceFullLoading || !chats.length) {
        let loadingShown = false;

        // Only show loading after a delay if operation takes time
        const loadingTimer = setTimeout(() => {
          loadingShown = true;
          updateState({ isLoading: true, isRefreshing: false });
        }, 300);

        // Perform the actual load
        await loadChats();

        // CRITICAL FIX: Don't update filteredChats here
        // Let the useEffect handle it to avoid duplicate updates
        updateState({
          isRefreshing: false
        });

        // Clear timer if it hasn't triggered yet
        clearTimeout(loadingTimer);

        // If loading was shown, give a slight delay before hiding
        if (loadingShown) {
          setTimeout(() => {
            updateState({ isLoading: false, isRefreshing: false });
          }, 100);
        } else {
          updateState({ isLoading: false, isRefreshing: false });
        }
      } else {
        // For background refreshes just update the data without visual indicators
        updateState({ isRefreshing: true });
        await loadChats();

        // CRITICAL FIX: Don't update filteredChats here
        // Let the useEffect handle it to avoid duplicate updates
        updateState({
          isRefreshing: false
        });
      }
    } catch (error) {
      logger.error('Error loading chats:', error);
      updateState({ isLoading: false, isRefreshing: false });
    }
  }, [loadChats, chats.length]);

  // Setup real-time message subscription - ONLY ONCE when component mounts
  useEffect(() => {
    if (!authState.currentUser || subscriptionRef.current) return;

    logger.debug('Setting up real-time message subscription in ChatPage - INITIAL SETUP');

    // Mark that we've set up the subscription
    subscriptionRef.current = true;

    // Initialize chat service and store with current user
    setCurrentUser(authState.currentUser);

    if (!ChatService.isInitialized()) {
      ChatService.initialize(authState.currentUser.studentId);
    }

    // This callback handles real-time message updates without causing UI flickering
    const handleMessageUpdate = (updatedChatId: string, newMessage?: ChatMessage, source?: 'socket' | 'supabase') => {
      // Log at debug level to reduce console noise
      logger.debug('Received real-time message update:', {
        updatedChatId,
        hasNewMessage: !!newMessage,
        isCurrentChat: currentChat?.id === updatedChatId,
        source: source || 'unknown'
      });

      // CRITICAL: Force UI update by explicitly updating local state
      if (newMessage) {
        // First add the message to the global store
        addOrUpdateMessage(newMessage);

        // Then IMMEDIATELY update our local state to refresh the UI
        const updatedChats = [...filteredChats];
        const chatIndex = updatedChats.findIndex(c => c.id === updatedChatId);

        if (chatIndex >= 0) {
          // Create a new chat object with the updated message
          const chatToUpdate = {...updatedChats[chatIndex]};

          // Update last message time and move to top
          chatToUpdate.lastMessageTime = newMessage.timestamp;
          chatToUpdate.lastMessage = {
            id: newMessage.id,
            content: newMessage.content,
            senderId: newMessage.senderId,
            timestamp: newMessage.timestamp,
            chatId: newMessage.chatId,
            readBy: newMessage.readBy || [],
            source: newMessage.source,
            sequence: newMessage.sequence
          };

          // Remove from current position
          updatedChats.splice(chatIndex, 1);
          // Add to the top
          updatedChats.unshift(chatToUpdate);

          logger.debug('Forcing UI update by moving chat to top:', updatedChatId);

          // Update local state to trigger re-render
          updateState({
            filteredChats: updatedChats,
            isRefreshing: false
          });

          // CRITICAL: If this is the current chat, mark as read and reload messages
          // This ensures the message appears in the chat window immediately
          if (currentChat?.id === updatedChatId) {
            markAsRead(updatedChatId);
            loadMessages(updatedChatId);
          }
        } else {
          // If the chat isn't in our list yet, reload all chats
          logger.debug('Chat not found in list, reloading all chats');
          loadUserChats(false);
        }
      } else {
        // Fallback: just reload the chat list (but with delay to prevent flicker)
        setTimeout(() => {
          loadUserChats();
        }, 500);
      }
    };

    // Set up the subscription
    ChatService.subscribeToMessageUpdates(handleMessageUpdate);

    // Initial load of chats
    loadUserChats(true);

    // Cleanup function
    return () => {
      logger.debug('Cleaning up message subscription');
      ChatService.unsubscribeFromMessageUpdates();
      subscriptionRef.current = false;
    };
  }, [authState.currentUser, setCurrentUser, loadMessages, addOrUpdateMessage, loadChats, loadUserChats, currentChat]);

  // CRITICAL FIX: Only update filteredChats when necessary, not on every render
  // This prevents the infinite re-render loop
  const prevChatsRef = useRef<string>('');
  const prevSearchRef = useRef<string>('');

  useEffect(() => {
    if (chats.length > 0) {
      // Check if chats or search query has actually changed
      const chatsJson = JSON.stringify(chats.map(c => c.id));
      const searchChanged = prevSearchRef.current !== searchQuery;
      const chatsChanged = prevChatsRef.current !== chatsJson;

      // Only update if something relevant has changed
      if (chatsChanged || searchChanged) {
        // Update our refs
        prevChatsRef.current = chatsJson;
        prevSearchRef.current = searchQuery || '';

        // Update the state
        logger.debug('Updating filtered chats due to change in chats or search');
        updateState({ filteredChats: filteredAndSortedChats });
      }
    }
  }, [chats, searchQuery, filteredAndSortedChats]);

  useEffect(() => {
    if (currentChat) {
      logger.debug('Loading messages for chat:', {
        chatId: currentChat.id,
        chatName: currentChat.name
      });
      loadMessages(currentChat.id);
    }
  }, [currentChat, loadMessages]);

  // Load user data for all chats
  useEffect(() => {
    const loadChatUsers = async () => {
      try {
        const users: Record<string, User> = {};
        // First add the current user
        if (authState.currentUser) {
          users[authState.currentUser.studentId] = authState.currentUser;
        }

        // Then load all unique participants from all chats
        const uniqueUserIds = new Set<string>();
        chats.forEach(chat => {
          chat.participants.forEach(userId => {
            if (!users[userId] && userId !== authState.currentUser?.studentId) {
              uniqueUserIds.add(userId);
            }
          });
        });

        // Fetch all needed users in parallel
        const userPromises = Array.from(uniqueUserIds).map(id => UserService.findUserById(id));
        const loadedUsers = await Promise.all(userPromises);

        // Add to users object
        loadedUsers.forEach(user => {
          if (user) {
            users[user.studentId] = user;
          }
        });

        logger.debug('Loaded chat users:', {
          count: Object.keys(users).length,
          userIds: Object.keys(users)
        });

        updateState({ chatUsers: users });
      } catch (error) {
        logger.error('Error loading chat users:', error);
      }
    };

    if (chats.length > 0) {
      loadChatUsers();
    }
  }, [chats, authState.currentUser]);

  useEffect(() => {
    // Check for mobile viewport on mount and window resize
    const checkMobile = () => {
      updateState({ isMobile: window.innerWidth < 768 });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);

      // Clean up any pending search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Optimize chat selection to prevent full chat list refresh
  const handleChatSelect = useCallback((chat: Chat) => {
    // Check if we're already on this chat to prevent unnecessary updates
    if (currentChat?.id === chat.id) {
      logger.debug('Chat already selected, skipping update');
      return;
    }

    logger.debug('Selecting chat:', { chatId: chat.id, chatName: chat.name });

    // Fix: Directly update state instead of using the callback pattern with prevState
    updateState({ currentChat: chat });

    // Ensure messages load properly
    setTimeout(() => {
      logger.debug(`Loading messages for selected chat: ${chat.id}`);

      // Explicitly load messages
      loadMessages(chat.id)
        .then(() => {
          logger.debug(`Successfully loaded messages for selected chat: ${chat.id}`);
          // Mark as read after messages are loaded
          return markAsRead(chat.id);
        })
        .catch(error => {
          logger.error(`Error loading messages for selected chat: ${chat.id}`, error);
        });
    }, 100);
  }, [currentChat?.id, loadMessages, markAsRead]);

  const handleUserSearch = async (query: string) => {
    updateState({ userSearchQuery: query });

    if (!query.trim()) {
      updateState({ searchResults: [] });
      return;
    }

    try {
      updateState({ isSearching: true });
      const results = await UserService.searchUsers(query);
      // Filter out the current user and users already in the chat
      const filteredResults = results.filter(user =>
        user.studentId !== authState.currentUser?.studentId &&
        !selectedUsers.some(selected => selected.studentId === user.studentId)
      );
      updateState({ searchResults: filteredResults, isSearching: false });
    } catch (error) {
      logger.error('Error searching users:', error);
      updateState({ isSearching: false });
    }
  };

  const handleAddUser = (user: User) => {
    updateState({
      selectedUsers: [...selectedUsers, user],
      searchResults: searchResults.filter(u => u.studentId !== user.studentId),
      userSearchQuery: ''
    });
  };

  const handleRemoveUser = (userId: string) => {
    updateState({ selectedUsers: selectedUsers.filter(u => u.studentId !== userId) });
  };

  const handleCreateDirectChat = async (user: User) => {
    if (!authState.currentUser) return;

    try {
      // Show loading state
      updateState({ isLoading: true });
      logger.debug('Creating direct chat with user:', {
        userId: user.studentId,
        userName: user.name || user.email
      });

      // First check if a direct chat already exists with this user
      const existingChat = chats.find(chat =>
        chat.type === 'direct' &&
        chat.participants.includes(user.studentId) &&
        chat.participants.includes(authState.currentUser!.studentId) &&
        chat.participants.length === 2
      );

      if (existingChat) {
        // If a chat already exists, select it
        logger.debug('Using existing chat:', { chatId: existingChat.id });
        handleChatSelect(existingChat);
        updateState({ showNewChatDialog: false, isLoading: false });
        return;
      }

      // Create a new direct chat
      const chatName = user.name || `${user.firstName} ${user.lastName}` || user.email;
      const participants = [authState.currentUser.studentId, user.studentId];

      logger.debug('Creating new chat with name:', { chatName, participants });

      try {
        const newChat = await ChatService.createChat(chatName, participants, '', 'direct');
        logger.debug('Created new chat:', { chatId: newChat.id, name: newChat.name });

        // Add the new chat to our store
        await loadChats();

        // Select the newly created chat
        handleChatSelect(newChat);
        updateState({ showNewChatDialog: false, isLoading: false });
      } catch (chatError) {
        logger.error('Failed to create chat in service:', chatError);

        // Create a temporary chat if the service fails
        const tempChat: Chat = {
          id: `temp-chat-${Date.now()}`,
          name: chatName,
          type: 'direct',
          participants,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        logger.debug('Created temporary chat:', { chatId: tempChat.id });
        handleChatSelect(tempChat);
        updateState({ showNewChatDialog: false, isLoading: false });
      }
    } catch (error) {
      logger.error('Error creating direct chat:', error);
      updateState({ isLoading: false });
    }
  };

  const handleCreateGroupChat = async () => {
    if (!authState.currentUser || selectedUsers.length === 0 || !groupName.trim()) {
      return;
    }

    try {
      // Add current user to participants
      const participants = [
        authState.currentUser.studentId,
        ...selectedUsers.map(u => u.studentId)
      ];

      // Create a new group chat
      const newChat = await ChatService.createChat(groupName.trim(), participants, '', 'group');

      // Add the new chat to our store
      await loadChats();

      // Select the newly created chat
      handleChatSelect(newChat);

      // Reset the dialog state
      updateState({
        showGroupDialog: false,
        selectedUsers: [],
        groupName: ''
      });
    } catch (error) {
      logger.error('Error creating group chat:', error);
    }
  };

  // Debounce search to prevent excessive updates
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to update the search query after a short delay
    // This prevents excessive updates while the user is typing
    searchTimeoutRef.current = setTimeout(() => {
      // Just update the search query - the memoized filteredAndSortedChats will handle the filtering
      updateState({ searchQuery: query });
      searchTimeoutRef.current = null;
    }, 300);
  };

  const handleNewChat = () => {
    updateState({ showNewChatDialog: true });
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.type === 'group') return chat.name;

    // For direct chats, show the other person's name
    if (chat.participants.length === 2 && authState.currentUser) {
      // Find the other participant (not the current user)
      const otherUserId = chat.participants.find(
        id => id !== authState.currentUser?.studentId
      );

      if (otherUserId && chatUsers[otherUserId]) {
        const user = chatUsers[otherUserId];
        // Try different name formats in order of preference
        return user.name ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.email ||
          'Chat Participant';
      }
    }

    return chat.name;
  };

  // Handle clear cache with improved loading
  const handleClearCache = async () => {
    try {
      logger.debug('Clearing chat cache');

      updateState({
        isLoading: true,
        currentChat: null,
        filteredChats: []
      });

      // Cancel any pending refreshes
      if (window.pendingRefreshTimeout) {
        clearTimeout(window.pendingRefreshTimeout);
      }

      if (window.debounceReloadTimer) {
        clearTimeout(window.debounceReloadTimer);
      }

      // Wait longer for cache clear to prevent flickering
      setTimeout(async () => {
        await loadChats();
        logger.debug('Chats reloaded after cache clear');

        setTimeout(() => {
          updateState({ isLoading: false });
        }, 300);
      }, 500);
    } catch (error) {
      logger.error('Error clearing cache and reloading chats:', error);
      updateState({ isLoading: false });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Chat List Section */}
      <div className={cn(
        "flex flex-col h-full",
        isMobile ? (
          currentChat
            ? "hidden"
            : "w-full"
        ) : (
          "w-80 border-r border-border"
        ),
      )}>
        {/* Fixed Header */}
        <ChatHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Chats</h1>
            <div className="flex gap-2">
              <ChatButton
                onClick={handleClearCache}
                size="icon"
                variant="ghost"
                className="icon-button"
                title="Clear Cache"
              >
                <X className="h-5 w-5" />
              </ChatButton>
              <ChatButton
                onClick={() => updateState({ showNewChatDialog: true })}
                size="icon"
                variant="ghost"
                className="icon-button"
                title="New Direct Chat"
              >
                <MessageSquare className="h-5 w-5" />
              </ChatButton>
              <ChatButton
                onClick={() => updateState({ showGroupDialog: true })}
                size="icon"
                variant="ghost"
                className="icon-button"
                title="New Group Chat"
              >
                <Users className="h-5 w-5" />
              </ChatButton>
            </div>
          </div>
          <div className="mt-4">
            <SearchInput
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search chats..."
              wrapperClassName="w-full"
            />
          </div>
        </ChatHeader>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-muted-foreground text-sm">Loading your conversations...</p>
              </div>
            </div>
          ) : filteredChats.length > 0 ? (
            <>
              {isRefreshing && (
                <div className="py-1 px-4 text-xs text-muted-foreground bg-accent/20 flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 border-2 border-primary/40 border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating conversations...</span>
                </div>
              )}
              {filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChat?.id === chat.id}
                  unreadCount={storeUnreadCounts[chat.id] || 0}
                  onClick={handleChatSelect}
                  getChatDisplayName={getChatDisplayName}
                  chatUsers={chatUsers}
                  authState={authState}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-muted-foreground mb-2">No chats found</p>
              <ChatButton
                onClick={() => updateState({ showNewChatDialog: true })}
                variant="secondary"
                size="sm"
              >
                Start a conversation
              </ChatButton>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window Section */}
      <div className={cn(
        "flex-1 h-full",
        isMobile && !currentChat && "hidden"
      )}>
        {currentChat ? (
          <ChatWindow
            chat={currentChat}
            onBack={() => {
              if (isMobile) {
                updateState({ currentChat: null });
              }
            }}
            isMobile={isMobile}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome to Chat</h2>
              <p className="text-muted-foreground">
                Select a chat or start a new conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog
        open={showNewChatDialog}
        onOpenChange={(open) => updateState({ showNewChatDialog: open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Direct Chat</DialogTitle>
            <DialogDescription>
              Start a conversation with another user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <SearchInput
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search users..."
                wrapperClassName="w-full"
              />

              {isSearching ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <div
                      key={user.studentId}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                      onClick={() => handleCreateDirectChat(user)}
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
            </div>
          </div>

          <DialogFooter>
            <ChatButton variant="secondary" onClick={() => updateState({ showNewChatDialog: false })}>
              Cancel
            </ChatButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Chat Dialog */}
      <Dialog
        open={showGroupDialog}
        onOpenChange={(open) => updateState({ showGroupDialog: open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group Chat</DialogTitle>
            <DialogDescription>
              Create a group chat with multiple users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <ChatInput
                value={groupName}
                onChange={(e) => updateState({ groupName: e.target.value })}
                placeholder="Enter group name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members</Label>
              <SearchInput
                value={userSearchQuery}
                onChange={(e) => {
                  updateState({ userSearchQuery: e.target.value });
                  handleUserSearch(e.target.value);
                }}
                placeholder="Search users..."
                wrapperClassName="w-full"
              />

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.studentId}
                      className="flex items-center space-x-1 bg-primary/10 rounded-full px-2 py-1"
                    >
                      <span className="text-sm">{user.name}</span>
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUser(user.studentId);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {isSearching ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.studentId}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddUser(user);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : userSearchQuery.trim() ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No users found
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <ChatButton variant="secondary" onClick={() => {
              updateState({
                showGroupDialog: false,
                groupName: '',
                selectedUsers: [],
                userSearchQuery: ''
              });
            }}>
              Cancel
            </ChatButton>
            <ChatButton
              onClick={handleCreateGroupChat}
              disabled={!groupName.trim() || selectedUsers.length === 0}
            >
              Create Group
            </ChatButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;