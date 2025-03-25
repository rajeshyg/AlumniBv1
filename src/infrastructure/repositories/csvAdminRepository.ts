import { AdminRepository } from '../../domain/repositories/adminRepository';
import { UserService } from '../../services/UserService';
import { Admin } from '../../models/Admin';
import { AssignMentorRoleRepository } from '../../domain/usecases/assignMentorRole';
import { User } from '../../domain/entities/User';
import { UserRepository, UserSearchResult } from '../../domain/repositories/userRepository';
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

  async getAdminWithRole(email: string): Promise<Admin | null> {
    try {
      const response = await fetch(this.adminFilePath);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const csvText = await response.text();
      const admins = this.parseCsv(csvText);
      const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
      
      return admin ? { email: admin.email, role: admin.role as Admin['role'] } : null;
    } catch (error) {
      logger.error("Failed to get admin role:", error);
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

  async updateUserRole(userId: string, role: string, studentId?: string): Promise<void> {
    try {
      logger.info(`Updating role for ${userId} to ${role}`, { studentId: studentId || 'none' });
      
      // Get current admin list
      const response = await fetch(this.adminFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch admin list: ${response.status}`);
      }
      const csvText = await response.text();
      
      // Parse the CSV
      const admins = this.parseCsv(csvText);
      
      // Find if user already exists
      const existingIndex = admins.findIndex(a => 
        a.email.toLowerCase() === userId.toLowerCase() && 
        (!studentId || a.studentId === studentId)
      );
      
      // Update or add user
      if (existingIndex >= 0) {
        logger.debug("Updating existing user", { index: existingIndex });
        admins[existingIndex].role = role;
        if (studentId) {
          admins[existingIndex].studentId = studentId;
        }
      } else {
        logger.debug("Adding new user", { userId, role, studentId });
        admins.push({ email: userId, role, studentId });
      }
      
      // Generate new CSV content
      const newCsvContent = this.stringifyCsv(admins);
      logger.debug("New CSV content created", { content: newCsvContent });
      
      // Try PUT endpoint first
      try {
        // Send PUT request
        const putResponse = await fetch('/admin-emails.csv', {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: newCsvContent
        });
        
        if (!putResponse.ok) {
          throw new Error(`PUT request failed: ${putResponse.status}`);
        }
        
        logger.info("Role updated successfully");
      } catch (putError) {
        logger.error("PUT request failed:", putError);
        
        // Fallback to POST endpoint
        logger.info("Falling back to POST request");
        const postResponse = await fetch('/update-admin-roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            csvContent: newCsvContent,
            email: userId, 
            role: role,
            studentId: studentId
          }),
        });
        
        if (!postResponse.ok) {
          throw new Error(`POST fallback failed: ${postResponse.status}`);
        }
        logger.info("Role updated successfully via POST fallback");
      }
    } catch (error) {
      logger.error("Failed to update user role:", error);
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
