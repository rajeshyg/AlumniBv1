import React, { useEffect, useRef } from 'react';
import { Chat, ChatMessage } from '../../models/Chat';
import { ChatService } from '../../services/ChatService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { Button } from '../ui/button';
import { Send, Paperclip, MoreVertical, Users, X, UserPlus } from 'lucide-react';
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

interface ChatWindowProps {
  chat: Chat;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat }) => {
  const { authState } = useAuth();
  const { device } = useThemeStore();
  const isMobile = device === 'mobile';
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [showMembers, setShowMembers] = React.useState(false);
  const [members, setMembers] = React.useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<User[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatMessages = ChatService.getChatMessages(chat.id);
    setMessages(chatMessages);

    // Mark messages as read when opening chat
    if (authState.currentUser) {
      ChatService.markMessagesAsRead(chat.id, authState.currentUser.studentId);
    }

    // Load chat members
    loadMembers();
  }, [chat.id, authState.currentUser, chat.participants]);

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

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !authState.currentUser) return;

    try {
      const message = ChatService.sendMessage(
        chat.id,
        authState.currentUser.studentId,
        newMessage.trim()
      );
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setIsTyping(false);
    } catch (error) {
      logger.error('Failed to send message', { error });
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
  };

  const handleLeaveChat = () => {
    if (!authState.currentUser) return;
    try {
      ChatService.removeParticipant(chat.id, authState.currentUser.studentId);
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
      logger.info('Removed member from chat', { 
        chatId: chat.id, 
        userId 
      });
    } catch (error) {
      logger.error('Failed to remove member', { error });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-2",
              message.senderId === authState.currentUser?.studentId ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-lg p-3",
                message.senderId === authState.currentUser?.studentId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {format(new Date(message.timestamp), 'HH:mm')}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
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

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Members</DialogTitle>
            <DialogDescription>
              Manage members in this chat
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search for new members */}
            <div className="space-y-2">
              <Label>Add New Members</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
              </div>
              {isSearching ? (
                <p className="text-sm text-muted-foreground">Searching...</p>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.studentId} className="flex items-center justify-between">
                      <span>{user.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddMember(user)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery && (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}
            </div>

            {/* Current members list */}
            <div className="space-y-2">
              <Label>Current Members</Label>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.studentId} className="flex items-center justify-between">
                    <span>{member.name}</span>
                    {member.studentId !== authState.currentUser?.studentId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.studentId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 