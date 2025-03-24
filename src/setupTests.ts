import '@testing-library/jest-dom';
import { vi, expect } from 'vitest'

declare global {
  var fetch: jest.Mock;
}

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.resetAllMocks();
});

// Any additional test setup can go here
