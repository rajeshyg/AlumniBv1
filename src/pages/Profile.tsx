import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Edit } from 'lucide-react';

export default function Profile() {
  const { authState } = useAuth();

  if (authState.loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  const user = authState.currentUser;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="bg-card p-6 rounded-lg border border-border/40 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Center</label>
            <p className="text-muted-foreground">{user.centerName}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Batch</label>
            <p className="text-muted-foreground">{user.batch}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Student ID</label>
            <p className="text-muted-foreground">{user.studentId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}