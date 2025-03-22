import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings, FileText } from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/posts', icon: FileText, label: 'Posts' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { device } = useThemeStore();
  const isMobile = device === 'mobile';

  if (isMobile) {
    return (
      <nav className={cn("py-2 px-4", className)}>
        <ul className="flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                    'hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={cn(
      "sticky top-16 h-[calc(100vh-4rem)] p-4 bg-card rounded-lg border border-border/40",
      className
    )}>
      <ul className="space-y-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2 rounded-md transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}