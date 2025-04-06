import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../models/User';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabaseClient';

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  loading: true,
  error: null,
  awaitingProfileSelection: false
};

// Create context
const AuthContext = createContext<{
  authState: AuthState;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    users?: User[];
    message?: string;
  }>;
  selectProfile: (user: User) => void;
  logout: () => void;
}>({
  authState: defaultAuthState,
  login: async () => ({ success: false }),
  selectProfile: () => {},
  logout: () => {}
});

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = UserService.getCurrentUser();
    logger.info('Auth initialization', { 
      hasUser: !!currentUser,
      userId: currentUser?.studentId 
    });
    
    setAuthState({
      isAuthenticated: !!currentUser,
      currentUser,
      loading: false,
      error: null,
      awaitingProfileSelection: false
    });
    
    // Preload users data
    UserService.loadUsers();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    logger.info('Login attempt', { email });
    
    try {
      const result = await UserService.login(email, password);
      if (result.success) {
        logger.info('Login successful', { 
          multipleProfiles: result.users && result.users.length > 1 
        });
        
        if (result.users && result.users.length > 1) {
          // Multiple profiles found, set awaiting selection
          setAuthState({
            isAuthenticated: true,
            currentUser: null,
            loading: false,
            error: null,
            awaitingProfileSelection: true
          });
        } else if (result.users?.[0]) {
          // Single user, proceed with login
          const user = result.users[0];
          
          // Try to set up Supabase auth for the user, but don't fail if it doesn't work
          try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: 'test' // Using default password for now
            });
            
            if (authError) {
              logger.error('Supabase auth error:', authError);
              // Continue anyway - we'll use the user ID directly
            } else {
              logger.info('Supabase auth successful', { 
                userId: user.studentId,
                email: user.email
              });
            }
          } catch (authError) {
            logger.error('Supabase auth exception:', authError);
            // Continue anyway - we'll use the user ID directly
          }
          
          setAuthState({
            isAuthenticated: true,
            currentUser: user,
            loading: false,
            error: null,
            awaitingProfileSelection: false
          });
        }
      } else {
        logger.error('Login failed', { message: result.message });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      logger.error('Login exception', { error: errorMessage });
      
      setAuthState({
        isAuthenticated: false,
        currentUser: null,
        loading: false,
        error: errorMessage,
        awaitingProfileSelection: false
      });
      return { success: false, message: errorMessage };
    }
  };

  // Select profile function (for multi-profile emails)
  const selectProfile = async (user: User) => {
    logger.info('Profile selected', { 
      userId: user.studentId,
      name: user.name 
    });
    
    // Try to set up Supabase auth for the selected user, but don't fail if it doesn't work
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'test' // Using default password for now
      });
      
      if (authError) {
        logger.error('Supabase auth error:', authError);
        // Continue anyway - we'll use the user ID directly
      } else {
        logger.info('Supabase auth successful', { 
          userId: user.studentId,
          email: user.email
        });
      }
    } catch (authError) {
      logger.error('Supabase auth exception:', authError);
      // Continue anyway - we'll use the user ID directly
    }
    
    UserService.selectUserProfile(user);
    setAuthState({
      isAuthenticated: true,
      currentUser: user,
      loading: false,
      error: null,
      awaitingProfileSelection: false
    });
  };

  // Logout function
  const logout = async () => {
    logger.info("Logging out user...");
    
    // Try to sign out from Supabase, but don't fail if it doesn't work
    try {
      const { error: supabaseError } = await supabase.auth.signOut();
      if (supabaseError) {
        logger.error('Supabase sign out error:', supabaseError);
      }
    } catch (error) {
      logger.error('Supabase sign out exception:', error);
    }
    
    // Clear the user from storage
    UserService.logout();
    
    // Update auth state to reflect logged out status
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      loading: false,
      error: null,
      awaitingProfileSelection: false
    });
    
    logger.info("User logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ authState, login, selectProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
