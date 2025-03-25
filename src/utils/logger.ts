/**
 * Application logger utility that adds consistent prefixes to console logs
 * to make them easier to filter in the terminal.
 */

// Store logs in memory for potential in-app display
const logHistory: {level: string, message: string, timestamp: string, args: any[]}[] = [];
const MAX_LOG_HISTORY = 100;

// Add visible logging
const addToLogHistory = (level: string, message: string, args: any[]) => {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
  };
  
  logHistory.unshift(logEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.pop();
  }
};

export const logger = {
  /**
   * Log debug information (implementation details)
   */
  debug: (message: string, ...args: any[]) => {
    // Force log to be visible in browser console with styling
    console.log(`%c[app:debug] ${message}`, 'color: blue; font-weight: bold;', ...args);
    addToLogHistory('debug', message, args);
  },
  
  /**
   * Log informational messages (general app status)
   */
  info: (message: string, ...args: any[]) => {
    // Always show info logs with styling
    console.log(`%c[app:info] ${message}`, 'color: green; font-weight: bold;', ...args);
    addToLogHistory('info', message, args);
  },
  
  /**
   * Log error messages (exceptions, failures)
   */
  error: (message: string, ...args: any[]) => {
    // Always show error logs with distinctive styling
    console.error(`%c[app:error] ${message}`, 'color: red; font-weight: bold; background: #ffeeee;', ...args);
    addToLogHistory('error', message, args);
  },
  
  /**
   * Get log history for in-app display
   */
  getLogHistory: () => [...logHistory],
  
  /**
   * Clear log history
   */
  clearLogHistory: () => {
    logHistory.length = 0;
  }
};

/**
 * Mock logger for testing environments
 */
export const mockLogger = {
  debug: () => {},
  info: () => {},
  error: () => {},
  getLogHistory: () => [],
  clearLogHistory: () => {}
};
