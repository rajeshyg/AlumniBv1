import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ValidateAdminEmail } from '../validateAdminEmail';
import { CsvAdminRepository } from '../../../infrastructure/repositories/csvAdminRepository';

describe('ValidateAdminEmail', () => {
  let validateAdminEmail: ValidateAdminEmail;
  let adminRepository: CsvAdminRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    adminRepository = new CsvAdminRepository();
    validateAdminEmail = new ValidateAdminEmail(adminRepository);
  });

  it('should return true for valid admin email', async () => {
    // Mock successful fetch response with role column
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('email,role\ndatta.rajesh@gmail.com,system_admin')
    });

    const result = await validateAdminEmail.execute('datta.rajesh@gmail.com');
    expect(result).toBe(true);
  });

  it('should return false for invalid admin email', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('email,role\ndatta.rajesh@gmail.com,system_admin')
    });

    const result = await validateAdminEmail.execute('invalid@example.com');
    expect(result).toBe(false);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });
});
