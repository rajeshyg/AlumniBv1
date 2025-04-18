import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search',
  className,
  wrapperClassName
}: SearchInputProps) => {
  return (
    <div className={cn(
      "flex items-center relative bg-muted/50 hover:bg-muted/80 transition-colors rounded-md px-3 py-1.5",
      wrapperClassName
    )}>
      <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "bg-transparent border-none pl-7 pr-2 py-0.5 text-sm focus:outline-none w-full",
          className
        )}
      />
    </div>
  );
};
