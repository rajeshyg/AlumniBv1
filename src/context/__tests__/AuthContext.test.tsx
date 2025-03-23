import { describe, it, expect } from 'vitest';
import { useAuth, AuthProvider } from '../AuthContext';

describe('AuthContext', () => {
  it('should export useAuth hook and AuthProvider', () => {
    expect(useAuth).toBeDefined();
    expect(AuthProvider).toBeDefined();
  });
});
