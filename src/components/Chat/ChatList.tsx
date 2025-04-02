import React, { useEffect } from 'react';
import { Chat } from '../../models/Chat';
import { ChatService } from '../../services/ChatService';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { cn } from '../../lib/utils';
import { MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  selectedChatId?: string;
  searchQuery?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ 
  onSelectChat, 
  selectedChatId, 
  searchQuery = '' 
}) => {
  const { authState } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (authState.currentUser) {
      loadChats();
    }
  }, [authState.currentUser]);

  const loadChats = async () => {
    if (!authState.currentUser) return;
    try {
      setLoading(true);
      const userChats = ChatService.getUserChats(authState.currentUser.studentId);
      setChats(userChats);
      logger.info('Loaded user chats', { 
        userId: authState.currentUser.studentId,
        chatCount: userChats.length 
      });
    } catch (error) {
      logger.error('Failed to load chats', { error });
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = React.useMemo(() => {
    if (!searchQuery) return chats;
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No chats found</p>
        {searchQuery && (
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search
          </p>
        )}
      </div>
    );
  }

  return (
    <div role="list" className="divide-y divide-border overflow-y-auto">
      {filteredChats.map(chat => (
        <div
          key={chat.id}
          role="listitem"
          aria-label={chat.name}
          onClick={() => onSelectChat(chat)}
          className={cn(
            "p-4 cursor-pointer hover:bg-accent transition-colors",
            selectedChatId === chat.id && "bg-accent"
          )}
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {chat.participants.length > 2 ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{chat.name}</h3>
              {chat.lastMessage ? (
                <p className="text-xs text-muted-foreground truncate">
                  {chat.lastMessage.content}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {chat.participants.length} participants
                </p>
              )}
            </div>
            {chat.lastMessageTime && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(chat.lastMessageTime), 'HH:mm')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 