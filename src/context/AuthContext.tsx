import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../models/User';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

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
      error: null
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
          setAuthState({
            isAuthenticated: true,
            currentUser: result.users[0],
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
        error: errorMessage
      });
      return { success: false, message: errorMessage };
    }
  };

  // Select profile function (for multi-profile emails)
  const selectProfile = (user: User) => {
    logger.info('Profile selected', { 
      userId: user.studentId,
      name: user.name 
    });
    
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
  const logout = () => {
    logger.info("Logging out user...");
    // First clear the user from storage
    UserService.logout();
    
    // Then update auth state to reflect logged out status
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      loading: false,
      error: null
    });
    
    logger.info("User logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ authState, login, selectProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth
export const useAuth = () => useContext(AuthContext);
