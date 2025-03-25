import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings, FileText, Shield, ClipboardCheck, Users } from 'lucide-react';
import { useThemeStore } from '../../store/theme';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { CsvAdminRepository } from '../../infrastructure/repositories/csvAdminRepository';
import { logger } from '../../utils/logger';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { device } = useThemeStore();
  const { authState } = useAuth();
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const isMobile = device === 'mobile';

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authState.currentUser?.email) {
        try {
          const adminRepo = new CsvAdminRepository();
          const admin = await adminRepo.getAdminWithRole(authState.currentUser.email);
          setAdminData(admin);
          logger.info("Admin status checked", { email: authState.currentUser.email, role: admin?.role });
        } catch (error) {
          logger.error("Admin status check failed:", error);
          setAdminData(null);
        }
      }
    };
    checkAdminStatus();
  }, [authState.currentUser]);

  const navItems = React.useMemo(() => [
    { to: '/home', icon: Home, label: 'Home' },
    ...(adminData?.role === 'system_admin' ? [
      { to: '/admin', icon: Shield, label: 'Admin' }
    ] : []),
    { to: '/posts', icon: FileText, label: 'Posts' },
    ...(adminData?.role === 'system_admin' || adminData?.role === 'moderator' 
      ? [{ to: '/moderation', icon: ClipboardCheck, label: 'Moderation' }] 
      : []
    ),
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ], [adminData]);

  if (isMobile) {
    return (
      <nav className={cn("py-2 px-4", className)}>
        <ul className="flex items-center justify-around flex-wrap gap-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1 min-w-[80px] max-w-[100px]">
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
                <span className="text-xs truncate w-full text-center">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className={cn(
      "h-fit bg-card rounded-lg border border-border/40",
      className
    )}>
      <ul className="flex flex-col gap-1 p-2">
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
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}