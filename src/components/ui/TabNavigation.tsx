import React from 'react';
import { Tabs, TabsList, TabsTrigger } from 'components/ui/tabs';

const tabItems = [
  { to: '/internships', label: 'Internships' },
  { to: '/admissions', label: 'Admissions' },
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/general', label: 'General' },
];

const TabNavigation: React.FC = () => {
  return (
    <Tabs>
      <TabsList>
        {tabItems.map(({ to, label }) => (
          <TabsTrigger key={to} value={to}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default TabNavigation;
