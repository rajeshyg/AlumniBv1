import React from 'react';
import { cn } from '../../lib/utils';
import { PostStatus } from '../../models/Post';

// Icons for different statuses
const StatusIcons = {
  pending: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  approved: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  rejected: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ),
  expired: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  )
};

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
  position?: 'inline' | 'absolute';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  position = 'inline'
}) => {
  const statusText = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const statusIcon = StatusIcons[status.toLowerCase() as keyof typeof StatusIcons];

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold z-10",
        "shadow-sm border border-transparent",
        position === 'absolute' && "absolute top-2 right-2",
        status === 'pending' && "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-800/90 dark:text-yellow-100 dark:border-yellow-700",
        status === 'approved' && "bg-green-100 text-green-800 border-green-200 dark:bg-green-800/90 dark:text-green-100 dark:border-green-700",
        status === 'rejected' && "bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-100 dark:border-red-700",
        status === 'expired' && "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/90 dark:text-gray-100 dark:border-gray-600",
        className
      )}
    >
      {statusIcon}
      {statusText}
    </div>
  );
};
