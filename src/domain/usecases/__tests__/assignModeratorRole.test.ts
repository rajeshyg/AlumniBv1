import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User } from '../../entities/User';

// Mimic the structure of assignMentorRole but for moderator
interface AssignModeratorRoleRepository {
  updateUserRole(userId: string, role: string, studentId?: string): Promise<void>;
  getUserById(userId: string): Promise<User>;
}

class AssignModeratorRole {
  constructor(private repository: AssignModeratorRoleRepository) {}

  async execute(adminId: string, userId: string, studentId?: string): Promise<void> {
    const admin = await this.repository.getUserById(adminId);
    if (admin.role !== 'system_admin') {
      throw new Error('Unauthorized: Only system admins can assign moderator roles');
    }

    const user = await this.repository.getUserById(userId);
    if (user.role !== 'student') {
      throw new Error('Invalid operation: Can only assign moderator role to students');
    }

    await this.repository.updateUserRole(userId, 'moderator', studentId);
  }
}

describe('AssignModeratorRole', () => {
  let mockRepository: AssignModeratorRoleRepository;
  let useCase: AssignModeratorRole;

  beforeEach(() => {
    mockRepository = {
      updateUserRole: vi.fn(),
      getUserById: vi.fn(),
    };
    useCase = new AssignModeratorRole(mockRepository);
  });

  it('should successfully assign moderator role to a student with studentId', async () => {
    const adminUser: User = { id: 'admin1', email: 'admin@test.com', role: 'system_admin' };
    const studentUser: User = { id: 'student1', email: 'student@test.com', role: 'student' };
    const studentId = 'STU001';

    vi.mocked(mockRepository.getUserById)
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(studentUser);

    await useCase.execute('admin1', 'student1', studentId);

    expect(mockRepository.updateUserRole).toHaveBeenCalledWith('student1', 'moderator', studentId);
  });

  it('should work without studentId for backward compatibility', async () => {
    const adminUser: User = { id: 'admin1', email: 'admin@test.com', role: 'system_admin' };
    const studentUser: User = { id: 'student1', email: 'student@test.com', role: 'student' };

    vi.mocked(mockRepository.getUserById)
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(studentUser);

    await useCase.execute('admin1', 'student1');

    expect(mockRepository.updateUserRole).toHaveBeenCalledWith('student1', 'moderator', undefined);
  });
});
