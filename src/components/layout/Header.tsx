import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { ThemeToggle } from '../theme-toggle';
import { DeviceToggle } from '../device-toggle';
import { ProfileToggle } from '../profile-toggle';
import { cn } from '../../lib/utils';
import { Logo } from '../ui/logo';

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-md border-b border-border/40 z-50",
      "transition-all duration-200",
      className
    )}>
      <div className="container h-full mx-auto px-4 flex items-center justify-between">
        <Logo />

        <div className="flex items-center gap-4">
          <DeviceToggle />
          <ThemeToggle />
          <button type="button" className="relative p-2 hover:bg-accent rounded-full transition-colors" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
          <ProfileToggle />
        </div>
      </div>
    </header>
  );
}