import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const tabItems = [
  { to: '/internships', label: 'Internships' },
  { to: '/admissions', label: 'Admissions' },
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/general', label: 'General' },
];

const TabNavigation: React.FC = () => {
  return (
    <div className="flex space-x-4 border-b">
      {tabItems.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => cn(
            'py-2 px-4 text-sm font-medium',
            isActive ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'
          )}
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
};

export default TabNavigation;
