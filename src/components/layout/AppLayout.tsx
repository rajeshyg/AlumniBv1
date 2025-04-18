import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ErrorFallback } from '../shared/ErrorFallback';
import { useThemeStore } from '../../store/theme';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { CsvAdminRepository } from '../../infrastructure/repositories/csvAdminRepository';
import { ValidateAdminEmail } from '../../domain/usecases/validateAdminEmail';
import { logger } from '../../utils/logger';
import { LogViewer } from '../Debug/LogViewer';

export const AppLayout = () => {
  const { authState, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { device } = useThemeStore();
  const isMobile = device === 'mobile';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authState.isAuthenticated && !authState.loading) {
      logger.info('User not authenticated, redirecting to login', {
        path: location.pathname,
        isLoading: authState.loading
      });
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.loading, navigate, location.pathname]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authState.currentUser?.email) {
        try {
          logger.debug('Checking admin status', {
            email: authState.currentUser.email,
            currentPath: location.pathname
          });

          const adminRepo = new CsvAdminRepository();
          const validateAdminEmail = new ValidateAdminEmail(adminRepo);
          const adminStatus = await validateAdminEmail.execute(authState.currentUser.email);

          setIsAdmin(adminStatus);
          logger.info('Admin status checked', {
            email: authState.currentUser.email,
            isAdmin: adminStatus
          });

          // Redirect admin to admin page if on home
          if (adminStatus && location.pathname === '/home') {
            logger.info('Admin user detected on home page, redirecting to admin page');
            navigate('/admin');
          }
        } catch (error) {
          logger.error('Failed to check admin status', error);
        }
      }
    };
    checkAdminStatus();
  }, [authState.currentUser, location.pathname, navigate]);

  // Add startup log to verify logger is working
  useEffect(() => {
    logger.info('AppLayout mounted', {
      path: location.pathname,
      auth: authState.isAuthenticated
    });
  }, []);

  return (
    <div className={cn(
      'min-h-screen bg-background',
      'flex flex-col',
      'transition-colors duration-300'
    )}>
      <Header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur" />

      <main className="flex-1">
        <div className="container mx-auto p-4">
          <div className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'grid-cols-[240px_1fr]'
          )}>
            {!isMobile && <Navigation className="sticky top-[80px]" />}

            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <div className="min-h-[calc(100vh-6rem)]">
                <Outlet />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {isMobile && (
        <Navigation className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/40 z-50" />
      )}

      {/* Add LogViewer component to see logs in the UI */}
      <LogViewer />
    </div>
  );
};