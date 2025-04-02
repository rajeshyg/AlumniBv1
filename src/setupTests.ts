import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';
import { configure } from '@testing-library/react';

// Configure Testing Library to suppress HTML output
configure({
  getElementError: (message: string | null, container?: Element) => {
    const errorMessage = message?.split('\n')[0] || 'Element not found';
    const error = new Error(errorMessage);
    error.name = 'TestingLibraryElementError';
    error.stack = undefined;
    return error;
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch API
declare global {
  // No need to redeclare fetch as it's handled below
}

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.resetAllMocks();
});

// Special log function that will always be visible in test output
// Use this for important test information that should not be filtered out
export const testLog = (message: string, ...args: any[]) => {
  console.log(`[TEST] ${message}`, ...args);
};

// Make testLog available globally in tests
global.testLog = testLog;

// Extend the global TypeScript definitions
declare global {
  var testLog: (message: string, ...args: any[]) => void;
}

// Any additional test setup can go here
