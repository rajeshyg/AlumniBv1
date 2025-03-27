import { CsvAdminRepository } from '../infrastructure/repositories/csvAdminRepository';
import { ValidateAdminEmail } from '../domain/usecases/validateAdminEmail';
import { logger } from '../utils/logger';

export class AdminService {
  private static instance: AdminService;
  private adminRepo: CsvAdminRepository;

  private constructor() {
    this.adminRepo = new CsvAdminRepository();
  }

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  public async validateAdminStatus(email: string): Promise<boolean> {
    try {
      const validateAdminEmail = new ValidateAdminEmail(this.adminRepo);
      return await validateAdminEmail.execute(email);
    } catch (error) {
      logger.error('Error validating admin status:', error);
      return false;
    }
  }
}
