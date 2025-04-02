import React, { useEffect, useState } from 'react';
import { Chat } from '../../models/Chat';
import { ChatService } from '../../services/ChatService';
import { UserService } from '../../services/UserService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { Button } from '../ui/button';
import { Plus, Users, MessageSquare, Search, X } from 'lucide-react';
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

export const ChatPage: React.FC = () => {
  const { authState } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (authState.currentUser) {
      // Initialize chat service
      ChatService.initialize();
      // Load user's chats
      loadChats();
    }
  }, [authState.currentUser]);

  const loadChats = () => {
    if (!authState.currentUser) return;
    try {
      const userChats = ChatService.getUserChats(authState.currentUser.studentId);
      setChats(userChats);
      logger.info('Loaded user chats', { 
        userId: authState.currentUser.studentId,
        chatCount: userChats.length 
      });
    } catch (error) {
      logger.error('Failed to load chats:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await UserService.searchUsers(query);
        const filteredUsers = users.filter(user => 
          user.studentId !== authState.currentUser?.studentId &&
          !selectedUsers.some(selected => selected.studentId === user.studentId)
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
      setChats(prev => [...prev, chat]);
      setSelectedChat(chat);
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
      setChats(prev => [...prev, chat]);
      setSelectedChat(chat);
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

  return (
    <div className="flex h-screen bg-background">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Chats</h1>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChatDialog(true)}
                title="New Direct Chat"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGroupDialog(true)}
                title="New Group Chat"
              >
                <Users className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
        <ChatList
          onSelectChat={handleChatSelect}
          selectedChatId={selectedChat?.id}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a chat or start a new conversation
          </div>
        )}
      </div>

      {/* New Direct Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Direct Chat</DialogTitle>
            <DialogDescription>
              Search for a user to start a conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="Search by name or email..."
                  className="pl-9"
                />
              </div>

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

      {/* New Group Chat Dialog */}
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
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="Search users..."
                  className="pl-9"
                />
              </div>

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
                      onClick={() => handleAddUser(user)}
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

              {selectedUsers.length > 0 && (
                <div className="mt-2 space-y-2">
                  <Label>Selected Members</Label>
                  <div className="space-y-2">
                    {selectedUsers.map(user => (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUser(user.studentId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
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