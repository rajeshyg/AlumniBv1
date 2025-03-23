import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from './TabNavigation';

describe('TabNavigation', () => {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'internships', label: 'Internships' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'scholarships', label: 'Scholarships' }
  ];
  
  it('renders all tabs correctly', () => {
    render(<TabNavigation tabs={tabs} activeTab="all" onTabChange={() => {}} />);
    
    tabs.forEach(tab => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });
  
  it('highlights the active tab', () => {
    render(<TabNavigation tabs={tabs} activeTab="internships" onTabChange={() => {}} />);
    
    const activeTab = screen.getByText('Internships');
    const nonActiveTab = screen.getByText('All');
    
    // The active tab should have the active class directly on the button
    expect(activeTab).toHaveClass('bg-primary');
    expect(nonActiveTab).not.toHaveClass('bg-primary');
  });
  
  it('calls onTabChange with the correct tab id when a tab is clicked', () => {
    const handleTabChange = vi.fn();
    render(<TabNavigation tabs={tabs} activeTab="all" onTabChange={handleTabChange} />);
    
    fireEvent.click(screen.getByText('Internships'));
    
    expect(handleTabChange).toHaveBeenCalledWith('internships');
  });
});
