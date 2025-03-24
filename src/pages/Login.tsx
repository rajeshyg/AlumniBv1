import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { ValidateAdminEmail } from '../domain/usecases/validateAdminEmail';

export default function Login() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only redirect if user is authenticated AND profile selection is complete
    if (authState.isAuthenticated && authState.currentUser && !authState.awaitingProfileSelection) {
      const validateAndRedirect = async () => {
        try {
          const adminRepo = new CsvAdminRepository();
          const validateAdminEmail = new ValidateAdminEmail(adminRepo);
          const isAdmin = await validateAdminEmail.execute(authState.currentUser.email);
          
          console.log('Auth validation result:', { isAdmin, email: authState.currentUser.email });
          navigate(isAdmin ? '/admin' : '/posts');
        } catch (error) {
          console.error('Error during auth validation:', error);
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
    </div>
  );
}
