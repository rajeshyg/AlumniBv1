import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../models/User';
import { IUserService, UserService } from '../services/UserService';

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
  switchProfile: (options: { keepEmail?: boolean; redirectToLogin?: boolean }) => void;
}>({
  authState: defaultAuthState,
  login: async () => ({ success: false }),
  selectProfile: () => {},
  logout: () => {},
  switchProfile: () => {}
});

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const userService: IUserService = new UserService();

  // Check for existing session on mount
  useEffect(() => {
    console.log("AuthContext useEffect: Checking for existing session"); // ADD LOG
    const currentUser = userService.getCurrentUser();
    console.log("AuthContext useEffect: Current user from service:", currentUser); // ADD LOG
    setAuthState({
      ...authState,
      loading: true
    });
    console.log("AuthContext useEffect: setAuthState to loading: true"); // ADD LOG
    
    userService.getCurrentUser()
      .then((currentUser) => setAuthState(prev => ({ ...prev, currentUser: currentUser || null, isAuthenticated: !!currentUser, loading: false }))).catch(() => setAuthState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, loading: false })));
  }, [userService]);

  const login = async (email: string, password: string) => {
    console.log("AuthContext login: Start", { email }); // ADD LOG
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await userService.login(email, password);
      
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
    userService.selectUserProfile(user);
    setAuthState({
      isAuthenticated: true,
      currentUser: user,
      loading: false,
      error: null
    });
  };

  // Logout function
  const logout = () => {
    console.log("AuthContext logout: Start"); // ADD LOG
    console.log("Logging out user...");
    // First clear the user from storage
    userService.logout();
    
    // Then update auth state to reflect logged out status
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      loading: false,
      error: null
    });
    
    console.log("AuthContext logout: User logged out successfully"); // ADD LOG
  };

  const switchProfile = (options: { keepEmail?: boolean; redirectToLogin?: boolean }) => {
    userService.switchProfile(options);
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    setAuthState({
      isAuthenticated: false,
      currentUser: null,
      loading: false,
      error: null
    });
  };

  return (
    <AuthContext.Provider value={{ authState, login, selectProfile, logout, switchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth
export const useAuth = () => useContext(AuthContext);
