import React from 'react';
import { cn } from '../../../lib/utils';
import { logger } from '../../../utils/logger';
import '../ChatStyles.css';

interface ChatBubbleProps {
  children: React.ReactNode;
  type: 'sent' | 'received';
  className?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  children,
  type,
  className
}) => {
  logger.debug('Rendering ChatBubble', { type });

  return (
    <div
      className={cn(
        "chat-bubble",
        type === 'sent'
          ? "chat-bubble-sent"
          : "chat-bubble-received",
        className
      )}
    >
      {children}
    </div>
  );
};

ChatBubble.displayName = "ChatBubble";
