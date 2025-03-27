import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../models/User';
import { AdminService } from '../../services/AdminService';
import { logger } from '../../utils/logger';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, selectProfile } = useAuth(); // Add login from useAuth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  // Single useEffect to handle both profile switch scenarios
  useEffect(() => {
    const state = location.state as { 
      switchProfile?: boolean; 
      profiles?: User[];
      email?: string;
    };

    if (state?.switchProfile) {
      logger.info('Profile switch mode detected', {
        hasProfiles: !!state.profiles,
        profileCount: state.profiles?.length
      });

      if (state.profiles) {
        setUserOptions(state.profiles);
        setShowOptions(true);
      }
      
      if (state.email) {
        setEmail(state.email);
        // Don't auto-submit when switching profiles
      }
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    
    try {
      logger.info('Login attempt initiated', { email });
      const result = await login(email, password); // Now login is defined
      
      if (result.success) {
        logger.info('Login successful', { 
          email, 
          multipleProfiles: result.users && result.users.length > 1 
        });
        
        if (result.users && result.users.length > 1) {
          logger.debug('Multiple profiles found for email', { 
            email, 
            profileCount: result.users.length 
          });
          setUserOptions(result.users);
          setShowOptions(true);
        }
      } else {
        logger.error('Login failed', { 
          email, 
          reason: result.message || 'Unknown error' 
        });
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Login process error', { 
        email, 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined 
      });
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (user: User) => {
    logger.info('User profile selected', {
      email: user.email,
      studentId: user.studentId, 
      name: user.name
    });
    
    // First, select the profile
    selectProfile(user);
    
    try {
      const adminService = AdminService.getInstance();
      const isAdmin = await adminService.validateAdminStatus(user.email);
      
      logger.info('Admin validation complete', { 
        email: user.email, 
        isAdmin 
      });
      
      // Navigate based on admin status
      navigate(isAdmin ? '/admin' : '/posts', { replace: true });
    } catch (error) {
      logger.error('Error during role validation:', { 
        error,
        email: user.email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      // Navigate to posts on error
      navigate('/posts', { replace: true });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-md border border-border/40">
      <h2 className="text-2xl font-semibold mb-6 text-center">Alumni Login</h2>
      
      {showOptions && userOptions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Your Profile</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Multiple accounts found with this email. Please select your profile.
          </p>
          
          <div className="space-y-2">
            {userOptions.map(user => (
              <button
                key={user.studentId}
                onClick={() => handleSelectProfile(user)}
                className="w-full text-left p-3 border border-border/40 rounded-md hover:bg-primary/5 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">
                    {user.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.centerName} {user.batch && `(${user.batch})`}
                  </div>
                </div>
                <span className="text-sm text-primary">Select</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
              placeholder="youremail@example.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 bg-background rounded-md"
              placeholder="Password"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center justify-center"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      )}
    </div>
  );
};

// Remove the default export
export default LoginForm;
