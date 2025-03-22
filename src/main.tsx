import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize theme from localStorage
const storedTheme = localStorage.getItem('theme-storage');
const theme = storedTheme
  ? JSON.parse(storedTheme).state.theme
  : 'system';

const root = document.documentElement;
if (theme === 'system') {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.classList.add(systemTheme);
} else {
  root.classList.add(theme);
}

// Listen for system theme changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  const storedTheme = localStorage.getItem('theme-storage');
  if (storedTheme && JSON.parse(storedTheme).state.theme === 'system') {
    root.classList.remove('light', 'dark');
    root.classList.add(e.matches ? 'dark' : 'light');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);