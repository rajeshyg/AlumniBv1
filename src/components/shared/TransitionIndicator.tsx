import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const TransitionIndicator: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show the indicator when location changes
    setIsVisible(true);
    setProgress(0);

    // Animate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 - prev) * 0.1;
        return newProgress >= 99 ? 99 : newProgress;
      });
    }, 50);

    // Hide the indicator after a delay
    const timeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsVisible(false), 200);
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1.5">
      <div
        className={cn(
          "h-full bg-primary transition-all duration-300 ease-out",
          "shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]", // Add glow effect
          progress === 100 ? "opacity-0" : "opacity-100"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
