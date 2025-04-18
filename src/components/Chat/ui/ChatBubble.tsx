import React from 'react';
import { cn } from '../../../lib/utils';

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
  return (
    <div
      className={cn(
        "chat-bubble inline-flex p-1.5 min-w-[60px] text-sm break-words",
        type === 'sent'
          ? "chat-bubble-sent rounded-xl rounded-br-sm ml-auto bg-primary/20 dark:bg-blue-200 text-primary-foreground dark:text-gray-800"
          : "chat-bubble-received rounded-xl rounded-bl-sm mr-auto bg-gray-400 dark:bg-gray-700 text-gray-800 dark:text-gray-200",
        className
      )}
      style={{
        overflowWrap: 'anywhere',
        maxWidth: '100%' // Ensure bubble doesn't overflow container
      }}
    >
      {children}
    </div>
  );
};

ChatBubble.displayName = "ChatBubble";
