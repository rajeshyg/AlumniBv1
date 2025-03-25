import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { ValidateAdminEmail } from '../domain/usecases/validateAdminEmail';
import { logger } from '../utils/logger';
import { LogViewer } from '../components/Debug/LogViewer';

export default function Login() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    logger.info('Login page mounted', { 
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.currentUser,
      awaitingSelection: authState.awaitingProfileSelection
    });
    
    // Only redirect if user is authenticated AND profile selection is complete
    if (authState.isAuthenticated && authState.currentUser && !authState.awaitingProfileSelection) {
      logger.info('User already authenticated, validating role');
      
      const validateAndRedirect = async () => {
        try {
          const adminRepo = new CsvAdminRepository();
          const validateAdminEmail = new ValidateAdminEmail(adminRepo);
          const isAdmin = await validateAdminEmail.execute(authState.currentUser.email);
          
          logger.info('Auth validation result:', { isAdmin, email: authState.currentUser.email });
          navigate(isAdmin ? '/admin' : '/posts');
        } catch (error) {
          logger.error('Error during auth validation:', error);
          navigate('/posts');
        }
      };
      
      validateAndRedirect();
    }
  }, [authState.isAuthenticated, authState.currentUser, authState.awaitingProfileSelection, navigate]);
  
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
