/**
 * Debug bootstrap module - Forces console logging to be visible
 * This runs early in the application startup to ensure all logs are captured
 */

import { logger } from '../utils/logger';

// Ensure console methods are properly visible
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Override console methods to ensure visibility
console.log = function(...args) {
  originalConsoleLog('%c[console:log]', 'color: gray;', ...args);
};

console.error = function(...args) {
  originalConsoleError('%c[console:error]', 'color: red; font-weight: bold;', ...args);
};

console.warn = function(...args) {
  originalConsoleWarn('%c[console:warn]', 'color: orange; font-weight: bold;', ...args);
};

console.info = function(...args) {
  originalConsoleInfo('%c[console:info]', 'color: teal;', ...args);
};

// Log bootstrap completion
logger.info('Debug bootstrap initialized', { 
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});

// Add some test logging to verify console is working
console.log('Standard console log test');
console.info('Standard console info test');
console.warn('Standard console warning test');

// Force some initial app logs
logger.debug('Debug logging test from bootstrap');
logger.info('Info logging test from bootstrap');
logger.error('Error logging test from bootstrap (this is just a test, not a real error)');

// Export a dummy object to ensure this module is imported correctly
export const debugBootstrap = {
  isInitialized: true
};
