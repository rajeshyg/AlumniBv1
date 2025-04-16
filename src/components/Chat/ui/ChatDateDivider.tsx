import React from 'react';
import { cn } from '../../../lib/utils';

interface ChatDateDividerProps {
  children: React.ReactNode;
  className?: string;
}

export const ChatDateDivider: React.FC<ChatDateDividerProps> = ({
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "chat-date-divider text-xs text-center mb-4 opacity-60",
        "text-muted-foreground",
        "bg-secondary px-3 py-1 rounded-full",
        "mx-auto w-fit",
        className
      )}
    >
      {children}
    </div>
  );
};

ChatDateDivider.displayName = "ChatDateDivider";
