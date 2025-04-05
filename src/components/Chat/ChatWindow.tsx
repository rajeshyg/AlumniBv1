import React, { useEffect, useRef, useState } from 'react';
import { Chat, ChatMessage } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { ChatService } from '../../services/ChatService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Button } from '../ui/button';
import { Send, Paperclip, MoreVertical, Users, X, UserPlus, MoreHorizontal, Reply, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
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

  const {
    messages,
    sendMessage,
    markAsRead,
    addTypingUser,
    removeTypingUser,
    typingUsers,
    refreshChats
  } = useChatStore();

  const chatMessages = messages[chat.id] || [];

  // Virtual list setup
  const rowVirtualizer = useVirtualizer({
    count: chatMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
    initialRect: { width: 0, height: 0 }
  });

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
      await sendMessage(chat.id, newMessage.trim());
      setNewMessage('');
      removeTypingUser(chat.id, authState.currentUser.studentId);
      logger.debug('Message sent successfully');
    } catch (error) {
      logger.error('Failed to send message', { error });
    }
  };

  const handleTyping = () => {
    if (!authState.currentUser) return;
    addTypingUser(chat.id, authState.currentUser.studentId);
    
    // Remove typing indicator after 3 seconds
    setTimeout(() => {
      removeTypingUser(chat.id, authState.currentUser!.studentId);
    }, 3000);
  };

  const handleLeaveChat = () => {
    if (!authState.currentUser) return;
    try {
      ChatService.removeParticipant(chat.id, authState.currentUser.studentId);
      refreshChats();
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
      await ChatService.addParticipant(chat.id, user.studentId);
      setMembers(prev => [...prev, user]);
      setSearchResults(prev => prev.filter(u => u.studentId !== user.studentId));
      refreshChats();
      logger.info('Added member to chat', { 
        chatId: chat.id, 
        userId: user.studentId 
      });
    } catch (error) {
      logger.error('Failed to add member', { error });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await ChatService.removeParticipant(chat.id, userId);
      setMembers(prev => prev.filter(member => member.studentId !== userId));
      refreshChats();
      logger.info('Removed member from chat', { 
        chatId: chat.id, 
        userId 
      });
    } catch (error) {
      logger.error('Failed to remove member', { error });
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isMobile ? "fixed inset-0 z-[100]" : "h-full"
    )}>
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-medium">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-semibold">{chat.name}</h2>
              <p className="text-sm text-muted-foreground">
                {chat.participants.length} participants
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowMembers(true)}>
                <Users className="h-4 w-4 mr-2" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLeaveChat} className="text-destructive">
                <X className="h-4 w-4 mr-2" />
                Leave Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ 
          height: isMobile ? 'calc(100% - 130px)' : 'calc(100vh - 180px)',
          paddingBottom: '16px'
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const message = chatMessages[virtualRow.index];
            const isCurrentUser = message.senderId === authState.currentUser?.studentId;
            const sender = chatUsers[message.senderId];
            
            return (
              <div
                key={message.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "flex items-start space-x-2 mb-4",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                {!isCurrentUser && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">
                      {sender?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                
                <ContextMenu>
                  <ContextMenuTrigger>
                    <div
                      className={cn(
                        "rounded-lg p-3 group relative inline-block",
                        isCurrentUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {!isCurrentUser && (
                        <div className="text-xs font-medium mb-1 text-muted-foreground">
                          {sender?.name || 'Unknown User'}
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs opacity-70">
                            {format(new Date(message.timestamp), 'HH:mm')}
                          </span>
                          {isCurrentUser && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </ContextMenuItem>
                    {isCurrentUser && (
                      <>
                        <ContextMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </ContextMenuItem>
                        <ContextMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>

                {isCurrentUser && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">
                      {authState.currentUser?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={cn(
        "bg-background border-t border-border",
        isMobile ? "fixed bottom-0 left-0 right-0 z-[100]" : "sticky bottom-0"
      )}>
        {/* Typing Indicator */}
        {typingUsers[chat.id]?.size > 0 && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            {(() => {
              const typingOtherUsers = Array.from(typingUsers[chat.id])
                .filter(id => id !== authState.currentUser?.studentId)
                .map(id => chatUsers[id]?.name)
                .filter(Boolean);
              
              if (typingOtherUsers.length === 0) return null;
              
              return `${typingOtherUsers.join(', ')} ${typingOtherUsers.length === 1 ? 'is' : 'are'} typing...`;
            })()}
          </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>

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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(user.studentId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembers(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 