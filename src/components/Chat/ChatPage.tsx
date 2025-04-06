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

export const ChatPage: React.FC = () => {
  const { authState } = useAuth();
  const { chats, currentChat, setCurrentChat, initialize, loadMessages } = useChatStore();
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [chatUsers, setChatUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize chat store and load data
  useEffect(() => {
    if (authState.currentUser) {
      logger.debug('Initializing chat store with user:', {
        userId: authState.currentUser.studentId,
        userName: authState.currentUser.name
      });
      const { setCurrentUser, initialize } = useChatStore.getState();
      setCurrentUser(authState.currentUser);
      initialize();
      
      // Load chats from the server
      const loadChatsFromServer = async () => {
        try {
          setIsLoading(true);
          const currentUserId = authState.currentUser?.studentId;
          if (!currentUserId) {
            logger.error('No current user ID found');
            return;
          }
          
          logger.debug('Loading chats from server for user:', currentUserId);
          
          // Get all chats where the user is a participant
          const { data: participantData, error: participantError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', currentUserId);
            
          if (participantError) {
            logger.error('Error loading chat participants:', participantError);
            return;
          }
          
          if (participantData && participantData.length > 0) {
            const chatIds = participantData.map((p: { chat_id: string }) => p.chat_id);
            
            // Get all chats
            const { data: chatData, error: chatError } = await supabase
              .from('chats')
              .select('*')
              .in('id', chatIds);
              
            if (chatError) {
              logger.error('Error loading chats:', chatError);
              return;
            }
            
            if (chatData && chatData.length > 0) {
              logger.debug(`Loaded ${chatData.length} chats from server`);
              
              // Get all participants for these chats
              const { data: allParticipants, error: allParticipantsError } = await supabase
                .from('chat_participants')
                .select('*')
                .in('chat_id', chatIds);
                
              if (allParticipantsError) {
                logger.error('Error loading all participants:', allParticipantsError);
                return;
              }
              
              // Get all messages for these chats
              const { data: allMessages, error: allMessagesError } = await supabase
                .from('chat_messages')
                .select('*')
                .in('chat_id', chatIds)
                .order('created_at', { ascending: true });
                
              if (allMessagesError) {
                logger.error('Error loading messages:', allMessagesError);
                return;
              }
              
              // Update the chat store with the loaded data
              const chatStore = useChatStore.getState() as unknown as ChatStore;
              
              // Convert to the format expected by the store
              const formattedChats = chatData.map((chat: any) => ({
                id: chat.id,
                name: chat.name,
                participants: allParticipants
                  .filter((p: { chat_id: string }) => p.chat_id === chat.id)
                  .map((p: { user_id: string }) => p.user_id),
                createdAt: chat.created_at,
                updatedAt: chat.updated_at,
                lastMessageId: chat.last_message_id,
                lastMessageTime: chat.last_message_time,
                lastMessage: allMessages
                  .filter((m: { chat_id: string }) => m.chat_id === chat.id)
                  .sort((a: { created_at: string }, b: { created_at: string }) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              }));
              
              const formattedMessages = allMessages.map((msg: any) => ({
                id: msg.id,
                chatId: msg.chat_id,
                senderId: msg.sender_id,
                content: msg.content,
                timestamp: msg.created_at,
                readBy: msg.read_by || []
              }));
              
              const formattedParticipants = allParticipants.map((p: any) => ({
                chatId: p.chat_id,
                userId: p.user_id,
                joinedAt: p.joined_at
              }));
              
              // Update the store with the loaded data
              chatStore.chats = formattedChats;
              chatStore.messages = formattedMessages.reduce((acc: Record<string, any[]>, msg: any) => {
                if (!acc[msg.chatId]) {
                  acc[msg.chatId] = [];
                }
                acc[msg.chatId].push(msg);
                return acc;
              }, {});
              chatStore.participants = formattedParticipants;
              
              logger.debug('Chat store updated with server data');
            }
          }
        } catch (error) {
          logger.error('Error loading chats from server:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadChatsFromServer();

      // Subscribe to real-time updates
      const chatSubscription = supabase
        .channel('chat_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
          logger.debug('Chat change received:', payload);
          loadChatsFromServer();
        })
        .subscribe();

      const messageSubscription = supabase
        .channel('message_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
          logger.debug('Message change received:', payload);
          if (currentChat) {
            loadMessages(currentChat.id);
          }
        })
        .subscribe();

      const participantSubscription = supabase
        .channel('participant_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, (payload) => {
          logger.debug('Participant change received:', payload);
          loadChatsFromServer();
        })
        .subscribe();

      return () => {
        chatSubscription.unsubscribe();
        messageSubscription.unsubscribe();
        participantSubscription.unsubscribe();
      };
    } else {
      logger.debug('No current user found, skipping chat store initialization');
    }
  }, [authState.currentUser, currentChat]);

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
        setChatUsers(users);
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

      setFilteredChats(filtered);
    } else {
      setFilteredChats([]);
    }
  }, [chats, searchQuery]);

  useEffect(() => {
    if (currentChat) {
      logger.debug('Loading messages for chat:', {
        chatId: currentChat.id,
        chatName: currentChat.name
      });
      const { loadMessages } = useChatStore.getState();
      loadMessages(currentChat.id);
    }
  }, [currentChat]);

  useEffect(() => {
    // Check for mobile viewport on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
  };

  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await UserService.searchUsers(query);
      // Filter out the current user and users already in the chat
      const filteredResults = results.filter(user => 
        user.studentId !== authState.currentUser?.studentId &&
        !selectedUsers.some(selected => selected.studentId === user.studentId)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      logger.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(u => u.studentId !== user.studentId));
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.studentId !== userId));
  };

  const handleCreateDirectChat = async (user: User) => {
    if (!authState.currentUser) return;
    try {
      const chat = await ChatService.createDirectChat(
        authState.currentUser.studentId,
        user.studentId
      );
      setCurrentChat(chat);
      setShowNewChatDialog(false);
      setSearchResults([]);
      logger.info('Created direct chat', { 
        chatId: chat.id,
        userId: user.studentId 
      });
    } catch (error) {
      logger.error('Failed to create direct chat:', error);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!authState.currentUser || !groupName.trim() || selectedUsers.length === 0) return;
    try {
      const participants = [
        authState.currentUser.studentId,
        ...selectedUsers.map(user => user.studentId)
      ];
      const chat = await ChatService.createChat(groupName, participants);
      setCurrentChat(chat);
      setShowGroupDialog(false);
      setGroupName('');
      setSelectedUsers([]);
      logger.info('Created group chat', { 
        chatId: chat.id,
        name: groupName,
        participantCount: participants.length 
      });
    } catch (error) {
      logger.error('Failed to create group chat:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewChat = () => {
    setShowNewChatDialog(true);
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.participants.length > 2) {
      return chat.name;
    }

    const otherParticipantId = chat.participants.find(
      id => id !== authState.currentUser?.studentId
    );
    
    if (otherParticipantId && chatUsers[otherParticipantId]) {
      return chatUsers[otherParticipantId].name || chat.name;
    }

    return chat.name;
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
                  onClick={() => {
                    ChatService.clearCache();
                    window.location.reload();
                  }} 
                  size="icon" 
                  variant="ghost"
                  className="icon-button" 
                  title="Clear Cache"
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => setShowNewChatDialog(true)} 
                  size="icon" 
                  variant="ghost"
                  className="icon-button" 
                  title="New Direct Chat"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => setShowGroupDialog(true)} 
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
                  {unreadCounts[chat.id] > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      {unreadCounts[chat.id]}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="text-muted-foreground mb-2">No chats found</p>
              <Button 
                onClick={() => setShowNewChatDialog(true)} 
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
                setCurrentChat(null);
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
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
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
            <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Chat Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
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
                onChange={(e) => setGroupName(e.target.value)}
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
                    setUserSearchQuery(e.target.value);
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
              setShowGroupDialog(false);
              setGroupName('');
              setSelectedUsers([]);
              setUserSearchQuery('');
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