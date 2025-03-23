import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ErrorFallback } from '../shared/ErrorFallback';
import { useThemeStore } from '../../store/theme';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const { device } = useThemeStore();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const isMobile = device === 'mobile';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.loading) {
      console.log("AppLayout: User not authenticated, redirecting to login");
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.loading, navigate]);

  return (
    <div className={cn(
      'min-h-screen bg-background',
      'flex flex-col',
      'transition-colors duration-300'
    )}>
      <Header />
      
      <main className={cn(
        "flex-1 container mx-auto px-4",
        isMobile ? "pb-16" : "pt-16"
      )}>
        <div className={cn(
          'grid gap-4',
          isMobile ? 'grid-cols-1' : 'grid-cols-[240px_1fr]'
        )}>
          {!isMobile && <Navigation />}
          
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <div className="min-h-[calc(100vh-4rem)]">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </main>

      {isMobile && <Navigation className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/40" />}
    </div>
  );
}