import React from 'react';
import { cn } from '../../../lib/utils';

interface ChatInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const ChatInput = React.forwardRef<HTMLInputElement, ChatInputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <input
          className={cn(
            "chat-input w-full rounded-full py-2 px-4",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "bg-secondary text-secondary-foreground",
            "placeholder:text-muted-foreground/70",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
