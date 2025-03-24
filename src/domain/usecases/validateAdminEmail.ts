import { AdminRepository } from '../repositories/adminRepository';

export class ValidateAdminEmail {
  constructor(private adminRepository: AdminRepository) {}

  async execute(email: string): Promise<boolean> {
    if (!email) return false;
    
    const admin = await this.adminRepository.getAdminWithRole(email.toLowerCase());
    return !!admin;
  }
}
