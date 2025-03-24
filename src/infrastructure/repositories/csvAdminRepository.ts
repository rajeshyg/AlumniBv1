import { AdminRepository } from '../../domain/repositories/adminRepository';
import { UserService } from '../../services/UserService';
import { Admin } from '../../models/Admin';

export class CsvAdminRepository implements AdminRepository {
  async getAdminEmails(): Promise<string[]> {
    const admins = await this.getAdmins();
    return admins.map(admin => admin.email.toLowerCase());
  }

  async getAdminWithRole(email: string): Promise<Admin | null> {
    try {
      const admins = await this.getAdmins();
      console.log('Fetched admins:', admins);
      const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
      console.log('Found admin for email:', email, admin);
      return admin || null;
    } catch (error) {
      console.error('Error getting admin with role:', error);
      return null;
    }
  }

  private async getAdmins(): Promise<Admin[]> {
    try {
      const response = await fetch(new URL('/admin-emails.csv', window.location.origin));
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const csvText = await response.text();
      console.log('Raw CSV text:', csvText);
      
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length <= 1) return [];
      
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');
      
      if (emailIndex === -1 || roleIndex === -1) {
        throw new Error('Invalid CSV format: missing email or role column');
      }
      
      return lines.slice(1)
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            email: values[emailIndex].toLowerCase(),
            role: values[roleIndex].toLowerCase() as Admin['role']
          };
        })
        .filter(admin => admin.email && admin.role);
    } catch (error) {
      console.error('Error loading admins:', error);
      return [];
    }
  }
}
