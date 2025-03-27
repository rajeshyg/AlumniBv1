import { AdminRepository } from '../../domain/repositories/adminRepository';
import { UserService } from '../../services/UserService';
import { Admin } from '../../models/Admin';
import { AssignMentorRoleRepository } from '../../domain/usecases/assignMentorRole';
import { User, UserRole } from '../../domain/entities/User';
import { UserRepository } from '../../domain/repositories/userRepository';
import { logger } from '../../utils/logger';

export class CsvAdminRepository implements AdminRepository, AssignMentorRoleRepository, UserRepository {
  private readonly adminFilePath = '/admin-emails.csv';
  private readonly usersFilePath = '/users.csv';
  private readonly userService = new UserService();

  private parseCsv(csvText: string): Array<{ email: string; role: string; studentId?: string }> {
    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].toLowerCase().split(',');
    const emailIndex = headers.indexOf('email');
    const roleIndex = headers.indexOf('role');
    const studentIdIndex = headers.indexOf('studentid');

    if (emailIndex === -1 || roleIndex === -1) {
      throw new Error('Invalid CSV format: missing email or role column');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        email: values[emailIndex].toLowerCase(),
        role: values[roleIndex].toLowerCase(),
        studentId: studentIdIndex !== -1 ? values[studentIdIndex] : undefined
      };
    });
  }

  private stringifyCsv(data: Array<{ email: string; role: string; studentId?: string }>): string {
    const headers = ['email', 'role', 'studentid'];
    const rows = data.map(item => 
      `${item.email},${item.role},${item.studentId || ''}`
    );
    return [headers.join(','), ...rows].join('\n');
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.getAdmins();
    return admins.map(admin => admin.email.toLowerCase());
  }

  async getAdminWithRole(email: string): Promise<{ email: string; role: string } | null> {
    try {
      logger.debug('Fetching admin data', { url: this.adminFilePath });
      
      const response = await fetch(this.adminFilePath, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admin data: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const lines = csvText.split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      
      if (lines.length === 0) {
        logger.warn('Admin CSV file is empty');
        return null;
      }
      
      const headers = lines[0].toLowerCase().split(',');
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');
      
      if (emailIndex === -1 || roleIndex === -1) {
        throw new Error(`Invalid CSV headers: ${headers.join(',')}`);
      }
      
      const adminLine = lines.slice(1).find(line => {
        const values = line.split(',');
        return values[emailIndex].trim().toLowerCase() === email.toLowerCase();
      });
      
      if (!adminLine) {
        return null;
      }
      
      const values = adminLine.split(',');
      return {
        email: values[emailIndex].trim(),
        role: values[roleIndex].trim()
      };
    } catch (error) {
      logger.error('Error in getAdminWithRole:', {
        error,
        email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async getAdmins(): Promise<Admin[]> {
    try {
      const response = await fetch(new URL('/admin-emails.csv', window.location.origin));
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const csvText = await response.text();
      logger.debug("Loaded admin CSV content:", csvText);
      
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
      logger.error("Failed to load admins:", error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(this.adminFilePath);
      const csvText = await response.text();
      const admins = this.parseCsv(csvText);
      const admin = admins.find(a => a.email === userId);
      
      if (!admin) {
        return {
          id: userId,
          email: userId,
          role: 'student'
        };
      }

      return {
        id: userId,
        email: userId,
        role: admin.role as UserRole
      };
    } catch (error) {
      logger.error("Failed to get user by ID:", error);
      return {
        id: userId,
        email: userId,
        role: 'student'
      };
    }
  }

  async updateUserRole(email: string, role: string, studentId?: string): Promise<void> {
    try {
      // First fetch current content
      const currentResponse = await fetch(this.adminFilePath);
      const currentContent = await currentResponse.text();
      
      // Parse current content
      const lines = currentContent.split('\n').filter(line => line.trim());
      const headers = lines[0];
      
      // Check if user already exists
      const userLineIndex = lines.findIndex(line => 
        line.toLowerCase().includes(email.toLowerCase())
      );
      
      // Prepare new line
      const newLine = `${email},${role},${studentId || ''}`;
      
      // Update or append
      if (userLineIndex > 0) {
        lines[userLineIndex] = newLine;
      } else {
        lines.push(newLine);
      }
      
      // Join content back together
      const newContent = lines.join('\n');
      
      logger.debug('Updating admin roles', {
        email,
        role,
        studentId,
        currentLines: lines.length
      });

      let updateResponse;

      try {
        // Try PUT first
        updateResponse = await fetch(this.adminFilePath, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: newContent
        });

        if (!updateResponse.ok) {
          throw new Error(`PUT failed: ${updateResponse.status}`);
        }
      } catch (putError) {
        // If PUT fails, try POST
        updateResponse = await fetch(this.adminFilePath, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: newContent
        });

        if (!updateResponse.ok) {
          throw new Error(`Both PUT and POST failed: ${putError}`);
        }
      }

      logger.info('Successfully updated admin role', {
        email,
        role,
        status: updateResponse.status
      });

      // Verify update
      const verifyResponse = await fetch(`${this.adminFilePath}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const verifyContent = await verifyResponse.text();
      
      logger.debug('Verification response', {
        status: verifyResponse.status,
        contentLength: verifyContent.length,
        includesNewEmail: verifyContent.includes(email)
      });

    } catch (error) {
      logger.error('Failed to update admin role', error);
      throw error;
    }
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    try {
      logger.info("Searching users", { query });
      const users = await this.userService.searchUsers(query);
      logger.debug("Search results:", users);
      
      return users.map(user => ({
        id: user.studentId || user.email, // Use studentId as id if available
        email: user.email,
        name: user.name,
        phone: user.phone,
        studentId: user.studentId, // Make sure to include studentId in the result
        role: 'student' // Default role, will be updated if they're in admin list
      }));
    } catch (error) {
      logger.error("Failed to search users:", error);
      throw new Error('Failed to search users: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private parseUsersCsv(csvText: string): UserSearchResult[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].toLowerCase().split(',');
    const emailIndex = headers.indexOf('email');
    const phoneIndex = headers.indexOf('phone');
    const nameIndex = headers.indexOf('name');

    if (emailIndex === -1) {
      throw new Error('Invalid CSV format: missing email column');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        id: values[emailIndex],
        email: values[emailIndex],
        phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
        name: nameIndex !== -1 ? values[nameIndex] : undefined,
        role: 'student' // Default role for users not in admin list
      };
    });
  }
}
