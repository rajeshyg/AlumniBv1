import React from 'react';
import { cn } from '../../../lib/utils';

interface ChatTimestampProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatTimestamp: React.FC<ChatTimestampProps> = ({
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "chat-timestamp text-xs mt-0.5",
        "text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
};

ChatTimestamp.displayName = "ChatTimestamp";
