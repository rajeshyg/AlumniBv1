import { Admin } from '../../models/Admin';

export interface AdminRepository {
  getAdminEmails(): Promise<string[]>;
  getAdminWithRole(email: string): Promise<Admin | null>;
}
