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
  const mockUsersData = 'email,name,phone,studentId\nuser1@test.com,User One,555-1234,STU001\nuser2@test.com,User Two,555-5678,STU002\n';

  beforeEach(() => {
    repository = new CsvAdminRepository();
    global.fetch = vi.fn((url) => {
      if (url.toString().includes('users.csv')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockUsersData)
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockCsvData)
      } as Response);
    });
    
    // Mock the userService.searchUsers method
    vi.spyOn(repository['userService'], 'searchUsers').mockResolvedValue([
      { email: 'user1@test.com', name: 'User One', studentId: 'STU001' },
      { email: 'user2@test.com', name: 'User Two', studentId: 'STU002' }
    ]);
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
      const repository = new CsvAdminRepository();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('email,role\ntest@test.com,admin') })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('updated content') }); // For verification

      await repository.updateUserRole('new@test.com', 'mentor');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Updated to expect 3 calls
      const putCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(putCall[0]).toBe('/admin-emails.csv');
      expect(putCall[1].method).toBe('PUT');
    });

    it('should update existing user role in CSV', async () => {
      const repository = new CsvAdminRepository();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('email,role\ntest@test.com,admin') })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('updated content') }); // For verification

      await repository.updateUserRole('mentor@test.com', 'system_admin');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Updated to expect 3 calls
      const putCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(putCall[0]).toBe('/admin-emails.csv');
      expect(putCall[1].method).toBe('PUT');
    });

    it('should include studentId when adding new user with role', async () => {
      const repository = new CsvAdminRepository();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('email,role\ntest@test.com,admin') })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('updated content') }); // For verification

      await repository.updateUserRole('new@test.com', 'mentor', 'STU003');

      expect(global.fetch).toHaveBeenCalledTimes(3); // Updated to expect 3 calls
      const putCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(putCall[0]).toBe('/admin-emails.csv');
      expect(putCall[1].method).toBe('PUT');
    });
  });

  describe('searchUsers', () => {
    it('should return search results from userService', async () => {
      // Update mock data to include studentId
      vi.spyOn(repository['userService'], 'searchUsers').mockResolvedValue([
        { email: 'user1@test.com', name: 'User One', studentId: 'STU001' },
        { email: 'user2@test.com', name: 'User Two', studentId: 'STU002' }
      ]);
      
      const results = await repository.searchUsers('user');
      
      expect(repository['userService'].searchUsers).toHaveBeenCalledWith('user');
      expect(results).toHaveLength(2);
      expect(results[0].email).toBe('user1@test.com');
      expect(results[1].id).toBe('STU002'); // Change to id instead of studentId
    });
  });

  describe('updateUserRole with PUT and POST fallback', () => {
    it('should try PUT first and fallback to POST on failure', async () => {
      const repository = new CsvAdminRepository();
      const initialContent = 'email,role\ntest@test.com,admin';
      const updatedContent = 'email,role\ntest@test.com,admin\nnew@test.com,moderator';
      
      global.fetch = vi.fn()
        // First call - GET initial content
        .mockResolvedValueOnce({ 
          ok: true, 
          text: () => Promise.resolve(initialContent) 
        })
        // Second call - PUT fails
        .mockRejectedValueOnce(new Error('Method Not Allowed'))
        // Third call - POST succeeds
        .mockResolvedValueOnce({ 
          ok: true,
          text: () => Promise.resolve(updatedContent)
        })
        // Fourth call - Verification
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(updatedContent)
        });

      await repository.updateUserRole('new@test.com', 'moderator');

      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      expect(fetchCalls[1][1].method).toBe('PUT');
      expect(fetchCalls[2][1].method).toBe('POST');
    });
  });
});
