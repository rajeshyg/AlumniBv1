import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { Admin } from '../models/Admin';

const ContentModeration: React.FC = () => {
  const { authState } = useAuth();
  const [adminData, setAdminData] = React.useState<Admin | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadAdminData = async () => {
      if (authState.currentUser?.email) {
        const adminRepo = new CsvAdminRepository();
        const admin = await adminRepo.getAdminWithRole(authState.currentUser.email);
        setAdminData(admin);
        setLoading(false);
      }
    };
    loadAdminData();
  }, [authState.currentUser]);

  if (loading) return <div>Loading...</div>;
  if (!adminData || !['system_admin', 'moderator'].includes(adminData.role)) {
    return <Navigate to="/posts" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Moderation</h1>
      </div>

      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Pending Posts</h2>
          <div className="space-y-4">
            {/* Pending posts list will go here */}
            <div className="text-muted-foreground">No pending posts to review.</div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recently Moderated</h2>
          <div className="space-y-4">
            {/* Recent moderation history will go here */}
            <div className="text-muted-foreground">No recent moderation history.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentModeration;
