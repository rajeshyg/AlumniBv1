import { User } from '../entities/User';

export interface AssignMentorRoleRepository {
  updateUserRole(userId: string, role: string): Promise<void>;
  getUserById(userId: string): Promise<User>;
}

export class AssignMentorRole {
  constructor(private repository: AssignMentorRoleRepository) {}

  async execute(adminId: string, userId: string): Promise<void> {
    const admin = await this.repository.getUserById(adminId);
    if (admin.role !== 'system_admin') {
      throw new Error('Unauthorized: Only system admins can assign mentor roles');
    }

    const user = await this.repository.getUserById(userId);
    if (user.role !== 'student') {
      throw new Error('Invalid operation: Can only assign mentor role to students');
    }

    await this.repository.updateUserRole(userId, 'mentor');
  }
}
