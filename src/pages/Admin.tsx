import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { Admin as AdminType } from '../models/Admin';
import { ROLE_PERMISSIONS } from '../models/Admin';

const Admin: React.FC = () => {
  const { authState } = useAuth();
  const [adminData, setAdminData] = React.useState<AdminType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAdminData = async () => {
      try {
        if (authState.currentUser?.email) {
          const adminRepo = new CsvAdminRepository();
          const admin = await adminRepo.getAdminWithRole(authState.currentUser.email);
          setAdminData(admin);
        }
      } catch (err) {
        setError('Failed to load admin data');
        console.error('Admin page error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, [authState.currentUser]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
      </div>
    );
  }

  if (!adminData) {
    return <Navigate to="/posts" replace />;
  }

  const permissions = ROLE_PERMISSIONS[adminData.role] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
          {adminData.role === 'system_admin' ? 'System Admin' : 'Moderator'}
        </span>
      </div>

      <div className="grid gap-6">
        {permissions.includes('manage_users') && (
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="text-muted-foreground">
              User management features coming soon...
            </div>
          </div>
        )}

        {permissions.includes('manage_settings') && (
          <div className="bg-card p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <div className="text-muted-foreground">
              Settings management coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
