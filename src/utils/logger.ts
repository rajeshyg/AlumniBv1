/**
 * Application logger utility that adds consistent prefixes to console logs
 * to make them easier to filter in the terminal.
 */

// Store logs in memory for potential in-app display
const logHistory: {level: string, message: string, timestamp: string, args: any[]}[] = [];
const MAX_LOG_HISTORY = 100;

// Check if we're in test mode
const isTestEnv = typeof process !== 'undefined' && 
  (process.env.NODE_ENV === 'test' || process.env.VITEST || import.meta.env?.MODE === 'test');

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
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
      logHistory.push({ level: 'debug', message, timestamp: new Date().toISOString(), args });
    }
  },
  
  /**
   * Log informational messages (general app status)
   */
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
    logHistory.push({ level: 'info', message, timestamp: new Date().toISOString(), args });
  },
  
  /**
   * Log warning messages (potential issues)
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
    logHistory.push({ level: 'warn', message, timestamp: new Date().toISOString(), args });
  },
  
  /**
   * Log error messages (exceptions, failures)
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    logHistory.push({ level: 'error', message, timestamp: new Date().toISOString(), args });
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
