import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/Auth/LoginForm';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in, but add a delay to ensure state is updated
  useEffect(() => {
    console.log("Login page loaded, auth state:", 
      JSON.stringify({
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.currentUser,
        loading: authState.loading
      })
    );
    
    // Only redirect if definitely authenticated and has user data
    if (authState.isAuthenticated && authState.currentUser) {
      console.log("User is authenticated, redirecting to posts");
      navigate('/posts');
    }
  }, [authState.isAuthenticated, authState.currentUser, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Alumni Community</h1>
        <LoginForm />
      </div>
    </div>
  );
}
