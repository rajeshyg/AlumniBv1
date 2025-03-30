import React, { Component, ErrorInfo } from 'react';
import { logger } from '../../utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('Unhandled error caught by ErrorBoundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (hasError) {
      return (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md p-4">
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h4 className="text-lg font-semibold">Something went wrong</h4>
              </div>
              <div className="mt-2">{error?.message || 'Cannot convert object to primitive value'}</div>
            </div>

            {isDevelopment && errorInfo && (
              <div className="mb-4 border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <details>
                  <summary className="cursor-pointer p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Error Details
                  </summary>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 text-sm font-mono overflow-auto max-h-[60vh]">
                    <div className="font-bold mb-2 text-red-500">{error?.name}: {error?.message}</div>
                    {error?.stack && (
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    )}
                    {errorInfo?.componentStack && (
                      <>
                        <div className="font-bold mt-4 mb-2">Component Stack:</div>
                        <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              </div>
            )}

            <button 
              onClick={this.handleReset}
              className="w-full p-3 flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 