import React from 'react';

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Home</h1>
      <div className="bg-card p-6 rounded-lg border border-border/40">
        <p className="text-muted-foreground">Welcome to the home page!</p>
      </div>
    </div>
  );
}