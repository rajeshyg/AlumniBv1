import React, { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { router } from './routes/index';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { LogViewer } from './components/Debug/LogViewer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
          {import.meta.env.DEV && <LogViewer />}
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;