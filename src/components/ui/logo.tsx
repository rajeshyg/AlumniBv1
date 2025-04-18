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
    sm: 'h-8 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const subtitleSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-base'
  };

  const logoContent = (
    <>
      <div className="flex items-center gap-3">
        <img
          src="/img/sgsgf-logo.png"
          alt="SGS Gita Foundation Logo"
          className={cn(sizeClasses[size])}
        />
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <h1 className={cn(
              "font-bold leading-tight tracking-tight text-foreground transition-colors",
              textSizeClasses[size]
            )}>
              SGS
            </h1>
            <h1 className={cn(
              "font-medium leading-tight tracking-tight text-primary ml-1.5",
              textSizeClasses[size]
            )}>
              Gita Connect
            </h1>
          </div>
          {showText && (
            <span className={cn(
              "text-muted-foreground leading-tight",
              subtitleSizeClasses[size]
            )}>
              Alumni Network
            </span>
          )}
        </div>
      </div>
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
