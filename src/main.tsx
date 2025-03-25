import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './utils/logger';
import './debug/bootstrap';

// Log application startup
logger.info('Application starting up', { 
  timestamp: new Date().toISOString(),
  environment: import.meta.env.MODE,
  debugEnabled: true
});

// Initialize theme from localStorage
const storedTheme = localStorage.getItem('theme-storage');
const theme = storedTheme
  ? JSON.parse(storedTheme).state.theme
  : 'system';

const root = document.documentElement;
if (theme === 'system') {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.classList.add(systemTheme);
  logger.debug('Applied system theme', { theme: systemTheme });
} else {
  root.classList.add(theme);
  logger.debug('Applied user theme', { theme });
}

// Listen for system theme changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  const storedTheme = localStorage.getItem('theme-storage');
  if (storedTheme && JSON.parse(storedTheme).state.theme === 'system') {
    root.classList.remove('light', 'dark');
    root.classList.add(e.matches ? 'dark' : 'light');
    logger.debug('Theme changed based on system preference', { newTheme: e.matches ? 'dark' : 'light' });
  }
});

// Mount application
const rootElement = document.getElementById('root');
logger.info('Mounting React application to DOM');

createRoot(rootElement!).render(
  <StrictMode>
    <App />
  </StrictMode>
);