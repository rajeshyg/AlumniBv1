import React from 'react';
import { Navigate } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { Admin as AdminType } from '../models/Admin';
import { ROLE_PERMISSIONS } from '../models/Admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Admin: React.FC = () => {
  const { authState } = useAuth();
  const [adminData, setAdminData] = React.useState<AdminType | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResult, setSearchResult] = React.useState<{ email: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>([]);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const repository = new CsvAdminRepository();
      console.log('Searching for:', searchQuery);
      
      const users = await repository.searchUsers(searchQuery);
      console.log('Search results:', users);
      
      // Get admin statuses for found users
      const userRoles = await Promise.all(
        users.map(async (user) => {
          const adminStatus = await repository.getAdminWithRole(user.email);
          return {
            ...user,
            role: adminStatus?.role || 'student'
          };
        })
      );
      
      console.log('Users with roles:', userRoles);
      setSearchResults(userRoles);
      setSearchResult(null);
    } catch (error) {
      console.error('Search error:', error);
      setError(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignModerator = async (email: string) => {
    if (!authState.currentUser?.email) return;

    setLoading(true);
    setError(null);
    try {
      const repository = new CsvAdminRepository();
      await repository.updateUserRole(email, 'moderator');
      setSearchResults((prevResults) =>
        prevResults.map((user) =>
          user.email === email ? { ...user, role: 'moderator' } : user
        )
      );
    } catch (error) {
      setError('Failed to assign moderator role');
    } finally {
      setLoading(false);
    }
  };

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

      {adminData.role === 'system_admin' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Moderator Management</h2>
          <div className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search by email, phone, or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Button 
              onClick={handleSearch}
              disabled={loading}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {error && (
            <p className="text-destructive mb-4">{error}</p>
          )}

          {searchResults.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Found {searchResults.length} user{searchResults.length === 1 ? '' : 's'}
            </p>
          )}

          <div className="space-y-4">
            {searchResults.map(user => (
              <div key={user.email} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    {user.name && (
                      <p className="font-medium">{user.name}</p>
                    )}
                    <p className="text-sm">{user.email}</p>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Current role: {user.role}
                    </p>
                  </div>
                  {user.role === 'student' && (
                    <Button
                      onClick={() => handleAssignModerator(user.email)}
                      disabled={loading}
                      variant="outline"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Assign Moderator Role
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {searchResults.length === 0 && !loading && !error && (
            <p className="text-muted-foreground text-center">
              No users found. Try searching by email, phone, or name.
            </p>
          )}
        </Card>
      )}

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
