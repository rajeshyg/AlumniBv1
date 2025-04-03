import React, { useState, useMemo, useEffect } from 'react';
import { Chat } from '../../models/Chat';
import { useChatStore } from '../../store/chat';
import { UserService } from '../../services/UserService';
import { User } from '../../models/User';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Search, Users, MessageSquare } from 'lucide-react';
import { Input } from '../ui/input';
import { logger } from '../../utils/logger';

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  selectedChatId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedChatId }) => {
  const { chats, unreadCounts, refreshChats } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatUsers, setChatUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  // Load user data for all chats
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const users: Record<string, User> = {};
        for (const chat of chats) {
          for (const userId of chat.participants) {
            if (!users[userId]) {
              const user = await UserService.findUserById(userId);
              if (user) users[userId] = user;
            }
          }
        }
        setChatUsers(users);
      } catch (error) {
        logger.error('Failed to load chat users:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [chats]);

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase();
    return chats.filter(chat => {
      const chatName = chat.name?.toLowerCase() || '';
      const participantNames = chat.participants
        .map(id => chatUsers[id]?.name?.toLowerCase() || '')
        .filter(Boolean);
      
      return chatName.includes(query) || 
             participantNames.some(name => name.includes(query));
    });
  }, [chats, searchQuery, chatUsers]);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;
    
    const otherParticipants = chat.participants
      .map(id => chatUsers[id]?.name)
      .filter(Boolean);
    
    return otherParticipants.join(', ');
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    return chat.lastMessage.content.length > 50
      ? `${chat.lastMessage.content.substring(0, 50)}...`
      : chat.lastMessage.content;
  };

  const getChatIcon = (chat: Chat) => {
    return chat.participants.length > 2 ? (
      <Users className="h-5 w-5 text-primary" />
    ) : (
      <MessageSquare className="h-5 w-5 text-primary" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>No chats found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try adjusting your search</p>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const unreadCount = unreadCounts[chat.id] || 0;
            const isSelected = chat.id === selectedChatId;
            
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "flex items-start space-x-3 p-4 cursor-pointer hover:bg-accent transition-colors",
                  isSelected && "bg-accent"
                )}
              >
                {/* Chat Avatar */}
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getChatIcon(chat)}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">
                      {getChatDisplayName(chat)}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(chat.lastMessage.timestamp), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {getLastMessagePreview(chat)}
                    </p>
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}; 