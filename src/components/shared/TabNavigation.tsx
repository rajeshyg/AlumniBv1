import React from 'react';
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';

export interface Tab {
  id?: string;
  label: string;
  category?: string;
  value: string;
}

interface TabNavigationProps {
  tabs: (Tab | string)[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  onTabClick?: (value: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onTabClick,
}) => {
  const { authState } = useAuth();

  const getTabValue = (tab: Tab | string): string => {
    if (typeof tab === 'string') return tab;
    return String(tab.value || tab.category || tab.label || '');
  };

  const getTabLabel = (tab: Tab | string): string => {
    if (typeof tab === 'string') return tab;
    return String(tab.label || '');
  };

  const handleTabClick = (value: string) => {
    if (typeof value !== 'string') {
      logger.error('Tab value is not a string:', value);
      return;
    }
    
    logger.debug('Tab clicked:', { value });
    if (onTabChange) {
      onTabChange(value);
    } else if (onTabClick) {
      onTabClick(value);
    }
  };

  if (authState?.loading) {
    return (
      <nav className="flex space-x-4" role="tablist">
        {tabs.map((tab, index) => {
          const label = typeof tab === 'string' ? tab : tab.label;
          return (
            <button
              key={index}
              role="tab"
              disabled
              className="px-4 py-2 text-sm font-medium transition-colors opacity-50"
            >
              {label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex space-x-4" role="tablist">
      {tabs.map((tab) => {
        const value = getTabValue(tab);
        const label = getTabLabel(tab);
        
        return (
          <button
            key={value}
            role="tab"
            data-testid={`tab-${label.toLowerCase()}`}
            onClick={() => handleTabClick(value)}
            aria-selected={activeTab === value}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
              activeTab === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
};
