import { AdminRepository } from '../repositories/adminRepository';

export class ValidateAdminEmail {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(email: string): Promise<boolean> {
    try {
      const admin = await this.adminRepository.getAdminWithRole(email);
      return admin !== null && ['system_admin', 'moderator'].includes(admin.role.toLowerCase());
    } catch (error) {
      console.error('Error validating admin email:', error);
      return false;
    }
  }
}
