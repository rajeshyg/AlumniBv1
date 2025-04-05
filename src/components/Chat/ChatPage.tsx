import React, { useEffect, useState } from 'react';
import { Chat } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { UserService } from '../../services/UserService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { ChatList } from './ChatList';
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

  useEffect(() => {
    if (authState.currentUser) {
      logger.debug('Initializing chat store with user:', {
        userId: authState.currentUser.studentId,
        userName: authState.currentUser.name
      });
      const { setCurrentUser, initialize } = useChatStore.getState();
      setCurrentUser(authState.currentUser);
      initialize();
    } else {
      logger.debug('No current user found, skipping chat store initialization');
    }
  }, [authState.currentUser]);

  // Separate effect for filtered chats
  useEffect(() => {
    if (chats.length > 0) {
      if (searchQuery) {
        const filtered = chats.filter(chat =>
          chat.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredChats(filtered);
      } else {
        setFilteredChats(chats);
      }
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
                <Button onClick={() => {
                  ChatService.clearCache();
                  window.location.reload();
                }} size="icon" variant="outline" title="Clear Cache">
                  <X className="h-5 w-5" />
                </Button>
                <Button onClick={() => setShowNewChatDialog(true)} size="icon" title="New Direct Chat">
                  <MessageSquare className="h-5 w-5" />
                </Button>
                <Button onClick={() => setShowGroupDialog(true)} size="icon" title="New Group Chat">
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
          {filteredChats.map((chat) => (
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
                    chat.name.charAt(0).toUpperCase()
                  )}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium truncate">{chat.name}</h3>
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
          ))}
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