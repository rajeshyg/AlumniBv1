import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignMentorRole, AssignMentorRoleRepository } from '../assignMentorRole';
import { User } from '../../entities/User';

describe('AssignMentorRole', () => {
  let mockRepository: AssignMentorRoleRepository;
  let useCase: AssignMentorRole;

  beforeEach(() => {
    mockRepository = {
      updateUserRole: vi.fn(),
      getUserById: vi.fn(),
    };
    useCase = new AssignMentorRole(mockRepository);
  });

  it('should successfully assign mentor role to a student', async () => {
    const adminUser: User = { id: 'admin1', email: 'admin@test.com', role: 'system_admin' };
    const studentUser: User = { id: 'student1', email: 'student@test.com', role: 'student' };

    vi.mocked(mockRepository.getUserById)
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(studentUser);

    await useCase.execute('admin1', 'student1');

    expect(mockRepository.updateUserRole).toHaveBeenCalledWith('student1', 'mentor');
  });

  it('should throw error if non-admin tries to assign mentor role', async () => {
    const nonAdminUser: User = { id: 'user1', email: 'user@test.com', role: 'mentor' };
    vi.mocked(mockRepository.getUserById).mockResolvedValueOnce(nonAdminUser);

    await expect(useCase.execute('user1', 'student1')).rejects.toThrow('Unauthorized');
  });

  it('should throw error if trying to assign mentor role to non-student', async () => {
    const adminUser: User = { id: 'admin1', email: 'admin@test.com', role: 'system_admin' };
    const moderatorUser: User = { id: 'mod1', email: 'mod@test.com', role: 'moderator' };

    vi.mocked(mockRepository.getUserById)
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(moderatorUser);

    await expect(useCase.execute('admin1', 'mod1')).rejects.toThrow('Invalid operation');
  });
});
