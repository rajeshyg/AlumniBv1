import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(true);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const error = new Error(`Page not found: ${window.location.pathname}`);
  error.stack = new Error().stack;

  useEffect(() => {
    logger.warn('404 page not found accessed', {
      path: window.location.pathname,
      stack: error.stack
    });
  }, []);

  const handleClose = () => {
    setOpen(false);
    navigate('/home');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Page Not Found</DialogTitle>
          <DialogDescription>
            The page you're looking for doesn't exist or has been moved.
          </DialogDescription>
        </DialogHeader>
        
        {isDevelopment && error.stack && (
          <details className="mt-4">
            <summary className="cursor-pointer p-2 bg-muted hover:bg-muted/80 rounded-md">
              Error Details
            </summary>
            <pre className="mt-2 p-4 bg-muted/30 rounded-md overflow-auto text-xs whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}

        <DialogFooter>
          <Button onClick={handleClose} variant="default">
            Go back home
          </Button>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}