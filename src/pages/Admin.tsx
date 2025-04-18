import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { SearchInput } from '../components/ui/search-input';
import { useAuth } from '../context/AuthContext';
import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { Admin as AdminType } from '../models/Admin';
import { ROLE_PERMISSIONS } from '../models/Admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { logger } from '../utils/logger';

const Admin: React.FC = () => {
  const { authState } = useAuth();
  const [adminData, setAdminData] = React.useState<AdminType | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResult, setSearchResult] = React.useState<{ email: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>([]);
  const [existingModerators, setExistingModerators] = React.useState<UserSearchResult[]>([]);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

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
        logger.error("Admin page error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, [authState.currentUser]);

  React.useEffect(() => {
    const loadModerators = async () => {
      if (!adminData || adminData.role !== 'system_admin') return;

      try {
        setLoading(true);
        const response = await fetch(`/admin-emails.csv?t=${Date.now()}`);
        const csvText = await response.text();

        const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
        const headers = lines[0].toLowerCase().split(',');
        const emailIndex = headers.indexOf('email');
        const roleIndex = headers.indexOf('role');
        const studentIdIndex = headers.indexOf('studentid');

        const moderators = lines.slice(1)
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            return {
              email: emailIndex >= 0 ? values[emailIndex].toLowerCase() : '',
              role: roleIndex >= 0 ? values[roleIndex].toLowerCase() : '',
              studentId: studentIdIndex >= 0 && studentIdIndex < values.length ? values[studentIdIndex] : undefined
            };
          })
          .filter(admin => admin.role === 'moderator')
          .map(moderator => ({
            id: moderator.studentId || moderator.email,
            email: moderator.email,
            role: 'moderator',
            studentId: moderator.studentId,
            name: ''
          }));

        logger.debug("Found moderators:", moderators);
        setExistingModerators(moderators);
      } catch (error) {
        logger.error("Failed to load moderators:", error);
      } finally {
        setLoading(false);
      }
    };

    loadModerators();
  }, [adminData, refreshTrigger]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const repository = new CsvAdminRepository();
      logger.info("Starting user search", { query: searchQuery });

      const users = await repository.searchUsers(searchQuery);
      logger.info('Search results:', users);

      const userRoles = await Promise.all(
        users.map(async (user) => {
          const adminStatus = await repository.getAdminWithRole(user.email);
          return {
            ...user,
            role: adminStatus?.role || 'student'
          };
        })
      );

      logger.debug("Users with roles:", userRoles);
      setSearchResults(userRoles);
      setSearchResult(null);
    } catch (error) {
      logger.error("Search failed:", error);
      setError(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignModerator = async (email: string, studentId?: string) => {
    if (!authState.currentUser?.email) return;

    setLoading(true);
    setError(null);
    try {
      const repository = new CsvAdminRepository();
      await repository.updateUserRole(email, 'moderator', studentId);

      // Reload moderators list
      const response = await fetch(`/admin-emails.csv?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const csvText = await response.text();

      // Parse and update moderators list
      const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
      const headers = lines[0].toLowerCase().split(',');
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');
      const studentIdIndex = headers.indexOf('studentid');

      const moderators = lines.slice(1)
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            email: values[emailIndex].toLowerCase(),
            role: values[roleIndex].toLowerCase(),
            studentId: studentIdIndex >= 0 ? values[studentIdIndex] : undefined
          };
        })
        .filter(admin => admin.role === 'moderator')
        .map(moderator => ({
          id: moderator.studentId || moderator.email,
          email: moderator.email,
          role: 'moderator',
          studentId: moderator.studentId,
          name: ''
        }));

      setExistingModerators(moderators);
      setSearchResults(prev =>
        prev.map(user =>
          user.email === email ? { ...user, role: 'moderator' } : user
        )
      );
    } catch (error) {
      logger.error("Failed to assign moderator role:", error);
      setError(error instanceof Error ? error.message : 'Failed to assign moderator role');
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
        <>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Existing Moderators</h2>
            {existingModerators.length > 0 ? (
              <div className="space-y-4">
                {existingModerators.map(moderator => (
                  <div key={moderator.id || moderator.email} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {moderator.name && (
                          <p className="font-medium">{moderator.name}</p>
                        )}
                        <p className="text-sm">{moderator.email}</p>
                        {moderator.studentId && (
                          <p className="text-sm text-muted-foreground">Student ID: {moderator.studentId}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Role: Moderator
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">
                No moderators found.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Moderator Management</h2>
            <div className="flex gap-4 mb-6">
              <div className="max-w-md w-full">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, phone, or name"
                  wrapperClassName="w-full"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
              >
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
                <div key={user.id || user.email} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {user.name && (
                        <p className="font-medium">{user.name}</p>
                      )}
                      <p className="text-sm">{user.email}</p>
                      {user.id && user.id !== user.email && (
                        <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                      )}
                      {user.phone && (
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Current role: {user.role}
                      </p>
                    </div>
                    {user.role === 'student' && (
                      <Button
                        onClick={() => handleAssignModerator(user.email, user.id)}
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
        </>
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
