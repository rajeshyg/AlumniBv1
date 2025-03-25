import React from 'react';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger'; // Import logger

const Home: React.FC = () => {
  const { authState } = useAuth();

  React.useEffect(() => {
    const loadPosts = async () => {
      try {
        // ...existing code...
      } catch (error) {
        logger.error('Error loading posts:', error); // Use logger
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {authState.currentUser?.name}</h1>
      </div>

      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <div className="text-muted-foreground">
            Welcome to your alumni community dashboard.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;