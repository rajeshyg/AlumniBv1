import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { LogViewer } from '../components/Debug/LogViewer';

export default function Login() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const state = location.state as { switchProfile?: boolean };
    
    // Don't redirect if we're in profile selection mode
    if (authState.awaitingProfileSelection) {
      return;
    }
    
    // Don't redirect if we're switching profiles
    if (state?.switchProfile) {
      return;
    }
    
    // Only redirect if authenticated and has a selected user
    if (authState.isAuthenticated && authState.currentUser) {
      logger.info('Authenticated user, redirecting', {
        userId: authState.currentUser.studentId,
        name: authState.currentUser.name
      });
      
      const validateAndRedirect = async () => {
        try {
          const adminRepo = new CsvAdminRepository();
          const validateAdminEmail = new ValidateAdminEmail(adminRepo);
          const isAdmin = await validateAdminEmail.execute(authState.currentUser.email);
          navigate(isAdmin ? '/admin' : '/posts', { replace: true });
        } catch (error) {
          logger.error('Error during auth validation:', error);
          navigate('/posts', { replace: true });
        }
      };
      
      validateAndRedirect();
    }
  }, [authState.isAuthenticated, authState.currentUser, authState.awaitingProfileSelection, navigate, location.state]);

  // Don't show login form if we're just selecting a profile
  if (authState.awaitingProfileSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Alumni Community</h1>
          <LoginForm />
        </div>
        <LogViewer />
      </div>
    );
  }

  // Show regular login form
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Alumni Community</h1>
        <LoginForm />
      </div>
      <LogViewer />
    </div>
  );
}
