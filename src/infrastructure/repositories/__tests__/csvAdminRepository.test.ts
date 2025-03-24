import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CsvAdminRepository } from '../csvAdminRepository';
import '@testing-library/jest-dom';

// Extend global to include fetch mock
declare global {
  var fetch: jest.Mock;
}

describe('CsvAdminRepository', () => {
  let repository: CsvAdminRepository;
  const mockCsvData = 'email,role\nadmin@test.com,system_admin\nmentor@test.com,mentor\n';

  beforeEach(() => {
    repository = new CsvAdminRepository();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockCsvData)
      } as Response)
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserById', () => {
    it('should return user with role from CSV if exists', async () => {
      const user = await repository.getUserById('admin@test.com');
      expect(user).toEqual({
        id: 'admin@test.com',
        email: 'admin@test.com',
        role: 'system_admin'
      });
    });

    it('should return user with student role if not in CSV', async () => {
      const user = await repository.getUserById('student@test.com');
      expect(user).toEqual({
        id: 'student@test.com',
        email: 'student@test.com',
        role: 'student'
      });
    });
  });

  describe('updateUserRole', () => {
    it('should add new user with role to CSV', async () => {
      await repository.updateUserRole('new@test.com', 'mentor');
      
      expect(global.fetch).toHaveBeenCalledTimes(2); // One GET, one POST
      const postCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(postCall[0]).toBe('/api/update-admin-roles');
      expect(postCall[1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('new@test.com,mentor'),
      });
    });

    it('should update existing user role in CSV', async () => {
      await repository.updateUserRole('mentor@test.com', 'system_admin');
      
      expect(global.fetch).toHaveBeenCalledTimes(2); // One GET, one POST
      const postCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(postCall[0]).toBe('/api/update-admin-roles');
      expect(postCall[1]).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('mentor@test.com,system_admin'),
      });
    });
  });
});
