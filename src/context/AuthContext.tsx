import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../models/User';
import { UserService } from '../services/UserService';

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  loading: true,
  error: null
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
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await UserService.login(email, password);
      
      if (result.success && result.users?.length === 1) {
        // Single user found - auto login
        setAuthState({
          isAuthenticated: true,
          currentUser: result.users[0],
          loading: false,
          error: null
        });
      } else if (!result.success) {
        // Login failed
        setAuthState({
          isAuthenticated: false,
          currentUser: null,
          loading: false,
          error: result.message || 'Login failed'
        });
      }
      
      return result;
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        currentUser: null,
        loading: false,
        error: 'An unexpected error occurred'
      });
      
      return { success: false, message: 'An unexpected error occurred' };
    }
  };

  // Select profile function (for multi-profile emails)
  const selectProfile = (user: User) => {
    UserService.selectUserProfile(user);
    setAuthState({
      isAuthenticated: true,
      currentUser: user,
      loading: false,
      error: null
    });
  };

  // Logout function
  const logout = () => {
    console.log("Logging out user...");
    // First clear the user from storage
    UserService.logout();
    
    // Then update auth state to reflect logged out status
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      loading: false,
      error: null
    });
    
    console.log("User logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ authState, login, selectProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth
export const useAuth = () => useContext(AuthContext);
