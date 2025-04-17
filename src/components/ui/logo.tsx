import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { logger } from '../../utils/logger';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  showText = true,
  size = 'md',
  to = '/'
}) => {
  logger.debug('Rendering Logo component', { showText, size });

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  const subtitleSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  const logoContent = (
    <>
      <img
        src="/img/logo-new.svg"
        alt="AlumniConnect Logo"
        className={cn(
          "transition-transform group-hover:scale-105 shadow-sm rounded-lg",
          sizeClasses[size]
        )}
      />
      {showText && (
        <div className="flex flex-col">
          <h1 className={cn(
            "font-bold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors",
            textSizeClasses[size]
          )}>
            AlumniConnect
          </h1>
          <span className={cn(
            "text-muted-foreground leading-tight",
            subtitleSizeClasses[size]
          )}>
            Campus Network
          </span>
        </div>
      )}
    </>
  );

  return to ? (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 group",
        className
      )}
    >
      {logoContent}
    </Link>
  ) : (
    <div className={cn(
      "flex items-center gap-2 group",
      className
    )}>
      {logoContent}
    </div>
  );
};
