import React from 'react';
import { logger } from '../../utils/logger';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log the error
  logger.error('Error caught by ErrorFallback:', {
    message: error.message,
    stack: error.stack
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <h2 className="text-xl font-bold text-destructive mb-4">Something went wrong</h2>
      <p className="mb-4 text-muted-foreground">{error.message}</p>
      
      {isDevelopment && error.stack && (
        <details className="mb-4 text-left w-full max-w-2xl">
          <summary className="cursor-pointer p-2 bg-muted hover:bg-muted/80 rounded-md">
            Error Details
          </summary>
          <pre className="mt-2 p-4 bg-muted/30 rounded-md overflow-auto text-xs whitespace-pre-wrap">
            {error.stack}
          </pre>
        </details>
      )}

      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Try again
      </button>
    </div>
  );
}