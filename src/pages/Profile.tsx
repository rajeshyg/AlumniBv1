import React from 'react';

export default function Profile() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="bg-card p-6 rounded-lg border border-border/40">
        <p className="text-muted-foreground">Your profile information will appear here.</p>
      </div>
    </div>
  );
}