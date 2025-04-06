import React, { useEffect, useState } from 'react';
import { Chat } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { UserService } from '../../services/UserService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { ChatWindow } from './ChatWindow';
import { Button } from '../ui/button';
import { Plus, Users, MessageSquare, Search, X, UserPlus } from 'lucide-react';
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
}

export const ChatPage: React.FC = () => {
  const { authState } = useAuth();
  const { chats, loadChats, loadMessages, sendMessage, markAsRead, setCurrentUser, unreadCounts: storeUnreadCounts } = useChatStore();
  
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
    isLoading: true
  });

  // Destructure state for easier access
  const { 
    currentChat, showNewChatDialog, showGroupDialog, selectedUsers, 
    userSearchQuery, searchResults, isSearching, groupName, 
    isMobile, searchQuery, filteredChats, chatUsers, isLoading 
  } = state;

  // Update specific state properties
  const updateState = (updates: Partial<ChatPageState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (authState.currentUser) {
      logger.debug('Initializing chat store with user:', {
        userId: authState.currentUser.studentId,
        userName: authState.currentUser.name
      });
      
      // Set the current user in the chat store
      setCurrentUser(authState.currentUser);
      
      // Load chats using our updated loadChats function
      const loadUserChats = async () => {
        try {
          updateState({ isLoading: true });
          await loadChats();
        } catch (error) {
          logger.error('Error loading chats:', error);
        } finally {
          updateState({ isLoading: false });
        }
      };
      
      loadUserChats();
    } else {
      logger.debug('No current user found, skipping chat store initialization');
    }
  }, [authState.currentUser, setCurrentUser, loadChats]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users: Record<string, User> = {};
        for (const chat of chats) {
          for (const userId of chat.participants) {
            if (!users[userId] && userId !== authState.currentUser?.studentId) {
              const user = await UserService.findUserById(userId);
              if (user) users[userId] = user;
            }
          }
        }
        updateState({ chatUsers: users });
      } catch (error) {
        logger.error('Failed to load chat users:', error);
      }
    };

    if (chats.length > 0 && authState.currentUser) {
      loadUsers();
    }
  }, [chats, authState.currentUser]);

  // Separate effect for filtered chats
  useEffect(() => {
    if (chats.length > 0) {
      let filtered = chats;
      
      // Apply search filter if query exists
      if (searchQuery) {
        filtered = chats.filter(chat =>
          chat.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sort chats by last message time, most recent first
      filtered = [...filtered].sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      updateState({ filteredChats: filtered });
    } else {
      updateState({ filteredChats: [] });
    }
  }, [chats, searchQuery]);

  useEffect(() => {
    if (currentChat) {
      logger.debug('Loading messages for chat:', {
        chatId: currentChat.id,
        chatName: currentChat.name
      });
      loadMessages(currentChat.id);
    }
  }, [currentChat, loadMessages]);

  useEffect(() => {
    // Check for mobile viewport on mount and window resize
    const checkMobile = () => {
      updateState({ isMobile: window.innerWidth < 768 });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChatSelect = (chat: Chat) => {
    updateState({ currentChat: chat });
    markAsRead(chat.id);
  };

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

  const handleSearch = (query: string) => {
    updateState({ searchQuery: query });
  };

  const handleNewChat = () => {
    updateState({ showNewChatDialog: true });
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.type === 'group') return chat.name;
    
    // For direct chats, show the other person's name
    if (chat.participants.length === 2) {
      const otherUserId = chat.participants.find(
        id => id !== authState.currentUser?.studentId
      );
      
      if (otherUserId && chatUsers[otherUserId]) {
        return chatUsers[otherUserId].name || 
          `${chatUsers[otherUserId].firstName} ${chatUsers[otherUserId].lastName}`;
      }
    }
    
    return chat.name;
  };

  // Add a function to handle cache clearing
  const handleClearCache = async () => {
    try {
      logger.debug('Clearing chat cache');
      // Clear the chats in the store and reload
      
      updateState({ 
        isLoading: true,
        currentChat: null,
        filteredChats: []
      });
      
      // Wait a moment and reload chats
      setTimeout(async () => {
        await loadChats();
        logger.debug('Chats reloaded after cache clear');
        updateState({ isLoading: false });
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
        "bg-card"
      )}>
        {/* Fixed Header */}
        <div className="w-full bg-card border-b border-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Chats</h1>
              <div className="flex gap-2">
                <Button 
                  onClick={handleClearCache} 
                  size="icon" 
                  variant="ghost"
                  className="icon-button" 
                  title="Clear Cache"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => updateState({ showNewChatDialog: true })} 
                  size="icon" 
                  variant="ghost"
                  className="icon-button" 
                  title="New Direct Chat"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => updateState({ showGroupDialog: true })} 
                  size="icon" 
                  variant="ghost"
                  className="icon-button" 
                  title="New Group Chat"
                >
                  <Users className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search chats..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading chats...</p>
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "flex items-center p-4 cursor-pointer hover:bg-accent transition-colors",
                  currentChat?.id === chat.id && "bg-accent"
                )}
                onClick={() => handleChatSelect(chat)}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <span className="text-lg font-medium">
                    {chat.participants.length > 2 ? (
                      <Users className="h-6 w-6" />
                    ) : (
                      getChatDisplayName(chat).charAt(0).toUpperCase()
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{getChatDisplayName(chat)}</h3>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(chat.lastMessageTime), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </p>
                  {storeUnreadCounts[chat.id] > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      {storeUnreadCounts[chat.id]}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-muted-foreground mb-2">No chats found</p>
              <Button 
                onClick={() => updateState({ showNewChatDialog: true })} 
                variant="outline" 
                size="sm"
              >
                Start a conversation
              </Button>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>

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
            <Button variant="outline" onClick={() => updateState({ showNewChatDialog: false })}>
              Cancel
            </Button>
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
              <Input
                value={groupName}
                onChange={(e) => updateState({ groupName: e.target.value })}
                placeholder="Enter group name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => {
                    updateState({ userSearchQuery: e.target.value });
                    handleUserSearch(e.target.value);
                  }}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>

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
                        onClick={() => handleRemoveUser(user.studentId)}
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
                      onClick={() => handleAddUser(user)}
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
            <Button variant="outline" onClick={() => {
              updateState({
                showGroupDialog: false,
                groupName: '',
                selectedUsers: [],
                userSearchQuery: ''
              });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroupChat}
              disabled={!groupName.trim() || selectedUsers.length === 0}
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage; 