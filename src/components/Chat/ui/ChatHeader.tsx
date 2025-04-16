import React from 'react';
import { cn } from '../../../lib/utils';

interface ChatHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "chat-header sticky top-0 z-10 px-4 py-3",
        "bg-card text-card-foreground",
        "border-b border-border",
        className
      )}
    >
      {children}
    </div>
  );
};

ChatHeader.displayName = "ChatHeader";
