import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../../models/User';
import { useAuth } from '../../context/AuthContext';

export const LoginForm: React.FC = () => {
  const location = useLocation();
  const { login, selectProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');  // Removed default 'test'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  // Handle direct profile selection mode
  useEffect(() => {
    const state = location.state as { switchProfile?: boolean; profiles?: User[] };
    if (state?.switchProfile && state.profiles) {
      setUserOptions(state.profiles);
      setShowOptions(true);
    }
  }, [location.state]);

  // Set email if switching profiles
  useEffect(() => {
    const state = location.state as { switchProfile?: boolean; email?: string };
    if (state?.switchProfile && state.email) {
      setEmail(state.email);
      // Automatically trigger login with stored email
      handleSubmit(new Event('submit') as any);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        if (result.users && result.users.length > 1) {
          // Multiple profiles found, show selection
          setUserOptions(result.users);
          setShowOptions(true);
        }
        // If only one user, the auth context will auto-login
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (user: User) => {
    selectProfile(user);
    setShowOptions(false);
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
